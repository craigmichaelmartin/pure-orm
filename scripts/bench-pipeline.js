/* eslint-disable no-console */
/* End-to-end JS-side pipeline benchmark: what a query costs AFTER pg-protocol
 * has decoded cells to strings, under different ingestion strategies. This is
 * the boundary `scripts/bench-ab.js` deliberately excludes - it times
 * `createFromDatabase` on prebuilt row objects, but in production the driver
 * builds those objects (and type-parses every cell) on the same critical
 * path, and on wide joins that costs several times the mapping itself.
 *
 *   node --expose-gc scripts/bench-pipeline.js <scenario> <leg>   # one leg
 *   node scripts/bench-pipeline.js                                # full matrix
 *
 * Input to every leg is the same prebuilt cells matrix: per row, an array of
 * (string | null) exactly as pg-protocol's DataRow parser yields them.
 *
 * Legs:
 *   pipeline-today  node-postgres parseRow simulation (type-parse every cell,
 *                   build the row object) + createFromDatabase - the
 *                   production JS-side path this library is consumed through
 *   pipeline-arrays type-parse every cell into value arrays (pg
 *                   rowMode:'array') + createFromDatabaseArrays
 *   pipeline-lazy   createFromDatabaseArrays directly on string cells with
 *                   parseKinds - the custom-Submittable integration layer
 *   pg-build        the parseRow simulation alone
 *   orm-today       createFromDatabase on PREBUILT typed object rows (what
 *                   bench-ab measures)
 *   orm-arrays      createFromDatabaseArrays on PREBUILT typed value arrays
 *
 * Every process asserts all three ingestion paths build JSON-identical
 * graphs before timing anything.
 */
const path = require('path');
const { execFileSync } = require('child_process');

const scenarioName = process.argv[2];
const legName = process.argv[3];

const load = (p) => require(path.resolve(__dirname, '..', p));

const SCENARIO_NAMES = ['product-page', 'account-orders', 'parcel-one', 'six'];
const LEG_NAMES = [
  'pipeline-today',
  'pipeline-lazy',
  'pipeline-arrays',
  'pg-build',
  'orm-today',
  'orm-arrays'
];

/* ------------------------------------------------------------------------ */
/* Runner mode: no scenario given - drive one process per (scenario, leg).   */
/* ------------------------------------------------------------------------ */
if (!scenarioName) {
  const REPEATS = Number(process.env.BENCH_REPEATS || 3);
  for (const scenario of SCENARIO_NAMES) {
    const best = {};
    for (let r = 0; r < REPEATS; r++) {
      for (const leg of LEG_NAMES) {
        const res = JSON.parse(
          execFileSync(
            process.execPath,
            ['--expose-gc', __filename, scenario, leg],
            { encoding: 'utf8', cwd: path.resolve(__dirname, '..') }
          )
        );
        if (!best[leg] || res.perRowNs < best[leg].perRowNs) best[leg] = res;
      }
    }
    const today = best['pipeline-today'].perRowNs;
    console.log(
      `\n${scenario} (${best['pipeline-today'].rows} rows x ${best['pipeline-today'].cols} cols)`
    );
    for (const leg of LEG_NAMES) {
      const ns = best[leg].perRowNs;
      const note = leg.startsWith('pipeline')
        ? `  ${(today / ns).toFixed(2)}x vs pipeline-today`
        : '';
      console.log(
        `  ${leg.padEnd(16)} ${String(ns).padStart(9)} ns/row${note}`
      );
    }
  }
  process.exit(0);
}

/* ------------------------------------------------------------------------ */
/* Probe mode: one (scenario, leg) in this process.                          */
/* ------------------------------------------------------------------------ */
const { createCore } = load('dist/src/core.js');
const kujoEntities = load('dist/test-utils/kujo/entities').entities;
const kujoRows = load('dist/test-utils/kujo/rows');
const sixEntities = load('dist/test-utils/six/entities').entities;
const sixRows = load('dist/test-utils/six/results.json');

/* Same multiplier logic as scripts/bench-ab.js so numbers line up. */
const isKeyColumn = (key) => key.endsWith('#id') || key.endsWith('_id');
const build = ({ baseRows, multiplier, distributeRoots }) => {
  const rows = [];
  for (let i = 0; i < multiplier; i++) {
    const offset = (i + 1) * 1000000;
    for (const row of baseRows) {
      const cloned = { ...row };
      if (distributeRoots) {
        for (const key in cloned) {
          const value = cloned[key];
          if (isKeyColumn(key) && typeof value === 'number') {
            cloned[key] = value + offset;
          }
        }
      }
      rows.push(cloned);
    }
  }
  return rows;
};

const SCENARIOS = {
  'product-page': () => ({
    entities: kujoEntities,
    objectRows: kujoRows.productPageRetail()
  }),
  'account-orders': () => ({
    entities: kujoEntities,
    objectRows: build({
      baseRows: kujoRows.accountOrders(),
      multiplier: 40,
      distributeRoots: true
    })
  }),
  'parcel-one': () => ({
    entities: kujoEntities,
    objectRows: kujoRows.parcelTracking()
  }),
  six: () => ({
    entities: sixEntities,
    objectRows: build({
      baseRows: sixRows,
      multiplier: 800,
      distributeRoots: true
    })
  })
};

const spec = SCENARIOS[scenarioName];
if (!spec) {
  console.error('scenarios:', Object.keys(SCENARIOS).join(', '));
  process.exit(1);
}
const { entities, objectRows } = spec();
const fields = Object.keys(objectRows[0]);
const width = fields.length;

/* Per-column parse kind, inferred from the fixture's typed values:
 * 0 none/text, 1 number, 2 timestamp, 3 bool, 4 json. One kind per column -
 * a database column has one type.
 */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const kinds = new Array(width).fill(0);
for (let j = 0; j < width; j++) {
  let kind = -1;
  for (const row of objectRows) {
    const v = row[fields[j]];
    if (v === null || v === undefined) continue;
    let k;
    if (typeof v === 'number') k = 1;
    else if (typeof v === 'boolean') k = 3;
    else if (typeof v === 'string') k = ISO.test(v) ? 2 : 0;
    else k = 4;
    if (kind === -1) kind = k;
    else if (kind !== k) {
      throw new Error('mixed column ' + fields[j] + ': ' + kind + '/' + k);
    }
  }
  kinds[j] = kind === -1 ? 0 : kind;
  if (isKeyColumn(fields[j]) && kinds[j] !== 0 && kinds[j] !== 1) {
    throw new Error('key column with non-scalar kind: ' + fields[j]);
  }
}

/* The cells matrix: what pg-protocol hands the driver - string or null. */
const toText = (v, kind) => {
  if (v === null || v === undefined) return null;
  if (kind === 3) return v ? 't' : 'f';
  if (kind === 4) return JSON.stringify(v);
  return typeof v === 'string' ? v : String(v);
};
const cells = objectRows.map((row) => {
  const out = new Array(width);
  for (let j = 0; j < width; j++) out[j] = toText(row[fields[j]], kinds[j]);
  return out;
});

const parseCell = (c, k) =>
  k === 0
    ? c
    : k === 1
    ? +c
    : k === 2
    ? new Date(c)
    : k === 3
    ? c === 't'
    : JSON.parse(c);

/* node-postgres Result.parseRow: object + per-cell type parse. */
const objectifyParse = (cellRows) => {
  const n = cellRows.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const src = cellRows[i];
    const row = {};
    for (let j = 0; j < width; j++) {
      const c = src[j];
      row[fields[j]] = c === null ? null : parseCell(c, kinds[j]);
    }
    out[i] = row;
  }
  return out;
};

/* pg rowMode:'array': same type parsing, no object build. */
const parseAll = (cellRows) => {
  const n = cellRows.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const src = cellRows[i];
    const row = new Array(width);
    for (let j = 0; j < width; j++) {
      const c = src[j];
      row[j] = c === null ? null : parseCell(c, kinds[j]);
    }
    out[i] = row;
  }
  return out;
};

const core = createCore({ entities });

/* Distinct fields identities per mode - lazy and preparsed plans differ. */
const fieldsLazy = fields.slice();
const fieldsTyped = fields.slice();

const typedObjectRows = objectifyParse(cells);
const typedArrayRows = parseAll(cells);

/* Graph fidelity: all ingestion paths must build the identical graph. */
{
  const g1 = core.createFromDatabase(objectifyParse(cells));
  const g2 = core.createFromDatabaseArrays(cells, fieldsLazy, kinds);
  const g3 = core.createFromDatabaseArrays(typedArrayRows, fieldsTyped, null);
  const j1 = JSON.stringify(g1);
  if (j1 !== JSON.stringify(g2) || j1 !== JSON.stringify(g3)) {
    throw new Error('graph mismatch between ingestion paths');
  }
  if (g1.models.length !== g2.models.length) {
    throw new Error('root count mismatch');
  }
}

const LEGS = {
  'orm-today': () => core.createFromDatabase(typedObjectRows),
  'orm-arrays': () =>
    core.createFromDatabaseArrays(typedArrayRows, fieldsTyped, null),
  'pg-build': () => objectifyParse(cells),
  'pipeline-today': () => core.createFromDatabase(objectifyParse(cells)),
  'pipeline-arrays': () =>
    core.createFromDatabaseArrays(parseAll(cells), fieldsTyped, null),
  'pipeline-lazy': () => core.createFromDatabaseArrays(cells, fieldsLazy, kinds)
};

const leg = LEGS[legName];
if (!leg) {
  console.error('legs:', Object.keys(LEGS).join(', '));
  process.exit(1);
}

for (let i = 0; i < 60; i++) leg();

const runRounds = (rounds) => {
  const t = process.hrtime.bigint();
  for (let i = 0; i < rounds; i++) leg();
  return Number(process.hrtime.bigint() - t) / 1e6;
};

/* Long samples amortize GC - see scripts/bench-ab.js. */
const TARGET_MS = Number(process.env.BENCH_TARGET_MS || 250);
let rounds = 4;
for (let probe = 0; probe < 14; probe++) {
  const ms = runRounds(rounds);
  if (ms >= TARGET_MS * 0.7) break;
  rounds = Math.max(rounds + 1, Math.ceil((rounds * TARGET_MS) / ms));
}

const samples = [];
for (let s = 0; s < 5; s++) {
  if (global.gc) global.gc();
  samples.push(runRounds(rounds));
}
samples.sort((a, b) => a - b);
const med = samples[Math.floor(samples.length / 2)];
console.log(
  JSON.stringify({
    scenario: scenarioName,
    leg: legName,
    rows: objectRows.length,
    cols: width,
    rounds,
    medMs: Number(med.toFixed(4)),
    minMs: Number(samples[0].toFixed(4)),
    perRowNs: Number(((med * 1e6) / (rounds * objectRows.length)).toFixed(2))
  })
);
