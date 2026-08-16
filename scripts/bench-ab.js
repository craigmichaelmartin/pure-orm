/* eslint-disable no-console */
/* Isolated A/B harness: runs ONE scenario against ONE core implementation in
 * its own process, so that cross-scenario inline-cache pollution and cache
 * thrash don't blur the comparison.
 *
 *   node --expose-gc scripts/bench-ab.js <coreModulePath> <scenario>
 */
const path = require('path');

const corePath = process.argv[2] || './dist/src/core';
const scenarioName = process.argv[3];
const SAMPLES = Number(process.env.BENCH_SAMPLES || 7);

const { createCore } = require(path.resolve(corePath));

const load = (p) => require(path.resolve(__dirname, '..', p));
const orderMore = load('dist/test-utils/order-more/entities').entities;
const blog = load('dist/test-utils/blog/entities').entities;
const thirteenEntities = load('dist/test-utils/thirteen/entities').entities;
const sixEntities = load('dist/test-utils/six/entities').entities;
const eleven = load('dist/test-utils/eleven/results.json');
const ten = load('dist/test-utils/ten/results.json');
const seven = load('dist/test-utils/seven/results.json');
const eight = load('dist/test-utils/eight/results.json');
const six = load('dist/test-utils/six/results.json');
const three = load('dist/test-utils/three/results');
const thirteen = load('dist/test-utils/thirteen/results.json');

const createRng = (seed) => {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};
const shuffleInPlace = (items, random) => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = items[i];
    items[i] = items[j];
    items[j] = t;
  }
};
const sparsifyRow = (row, prefix) => {
  const s = {};
  for (const k in row) s[k] = k.startsWith(prefix + '#') ? row[k] : null;
  return s;
};
const build = ({
  baseRows,
  baseRowsSet,
  multiplier,
  distributeRoots,
  sparseJoins,
  shuffleRows,
  rng
}) => {
  const src = baseRowsSet ? baseRowsSet.flat() : baseRows;
  const rootTable = (
    Object.keys(src[0]).find((k) => k.endsWith('#id')) || 'order#id'
  ).split('#')[0];
  const rows = [];
  for (let i = 0; i < multiplier; i++) {
    for (const row of src) {
      const base = sparseJoins ? sparsifyRow(row, rootTable) : row;
      const cloned = { ...base };
      if (distributeRoots) {
        cloned[rootTable + '#id'] = row[rootTable + '#id'] + (i + 1) * 10000;
      }
      rows.push(cloned);
    }
  }
  if (shuffleRows) shuffleInPlace(rows, rng);
  return rows;
};

const compositePk = (multiplier) => {
  class CompositeRoot {
    constructor(props) {
      Object.assign(this, props);
    }
  }
  class CompositeRoots {
    constructor({ models }) {
      this.models = models;
    }
  }
  class CompositeChild {
    constructor(props) {
      Object.assign(this, props);
    }
  }
  class CompositeChildren {
    constructor({ models }) {
      this.models = models;
    }
  }
  const entities = [
    {
      tableName: 'comp_root',
      columns: [
        { column: 'tenant_id', primaryKey: true },
        { column: 'order_id', primaryKey: true },
        'label'
      ],
      Model: CompositeRoot,
      Collection: CompositeRoots
    },
    {
      tableName: 'comp_child',
      columns: [
        'id',
        { column: 'root_key', references: CompositeRoot },
        'value'
      ],
      Model: CompositeChild,
      Collection: CompositeChildren
    }
  ];
  const rows = [];
  let childId = 1;
  for (let m = 0; m < multiplier; m++) {
    for (let tenantId = 1; tenantId <= 20; tenantId++) {
      const orderId = m + 1000;
      const rootKey = `${tenantId}${orderId}`;
      for (let c = 0; c < 3; c++) {
        rows.push({
          'comp_root#tenant_id': tenantId,
          'comp_root#order_id': orderId,
          'comp_root#label': `r-${tenantId}-${orderId}`,
          'comp_child#id': childId++,
          'comp_child#root_key': rootKey,
          'comp_child#value': `v-${c}`
        });
      }
    }
  }
  return { entities, rows };
};

const rng = createRng(1337);

const SCENARIOS = {
  'same-root': () => ({
    entities: orderMore,
    rows: build({ baseRows: eleven, multiplier: 120 }),
    rounds: 12
  }),
  'many-roots': () => ({
    entities: orderMore,
    rows: build({ baseRows: eleven, multiplier: 120, distributeRoots: true }),
    rounds: 6
  }),
  'mixed-fixtures': () => ({
    entities: orderMore,
    rows: build({
      baseRowsSet: [seven, eight, ten, eleven],
      multiplier: 80,
      distributeRoots: true,
      shuffleRows: true,
      rng
    }),
    rounds: 6
  }),
  'sparse-joins': () => ({
    entities: orderMore,
    rows: build({ baseRows: eleven, multiplier: 120, sparseJoins: true }),
    rounds: 30
  }),
  'sparse-many': () => ({
    entities: orderMore,
    rows: build({
      baseRows: eleven,
      multiplier: 120,
      distributeRoots: true,
      sparseJoins: true
    }),
    rounds: 20
  }),
  'blog-three': () => ({
    entities: blog,
    rows: build({ baseRows: three, multiplier: 400, distributeRoots: true }),
    rounds: 8
  }),
  thirteen: () => ({
    entities: thirteenEntities,
    rows: build({ baseRows: thirteen, multiplier: 400, distributeRoots: true }),
    rounds: 12
  }),
  six: () => ({
    entities: sixEntities,
    rows: build({ baseRows: six, multiplier: 800, distributeRoots: true }),
    rounds: 20
  }),
  'composite-pk': () => {
    const c = compositePk(120);
    return { entities: c.entities, rows: c.rows, rounds: 8 };
  },
  'tiny-1row': () => ({
    entities: orderMore,
    rows: [eleven[0]],
    rounds: 4000
  }),
  'tiny-24row': () => ({
    entities: orderMore,
    rows: eleven,
    rounds: 800
  }),
  /* Real applications issue many different SELECTs against one ORM instance,
   * so the row processor call site is megamorphic rather than monomorphic.
   * These rotate several query shapes / entity sets through one process.
   */
  'multi-shape': () => {
    const full = build({ baseRows: eleven, multiplier: 20 });
    const allKeys = Object.keys(full[0]);
    const tables = [...new Set(allKeys.map((k) => k.split('#')[0]))];
    const variants = [];
    for (let v = 0; v < 6; v++) {
      // Each variant drops a different tail of tables (root always kept).
      const keep = new Set(tables.slice(0, tables.length - v));
      const keys = allKeys.filter((k) => keep.has(k.split('#')[0]));
      variants.push(
        full.map((row) => {
          const out = {};
          for (const k of keys) out[k] = row[k];
          return out;
        })
      );
    }
    return { entities: orderMore, rowSets: variants, rounds: 4 };
  },
  'multi-core': () => ({
    coreSets: [
      {
        entities: orderMore,
        rows: build({ baseRows: eleven, multiplier: 20 })
      },
      { entities: blog, rows: build({ baseRows: three, multiplier: 60 }) },
      {
        entities: thirteenEntities,
        rows: build({ baseRows: thirteen, multiplier: 60 })
      },
      {
        entities: sixEntities,
        rows: build({ baseRows: six, multiplier: 120 })
      },
      {
        entities: orderMore,
        rows: build({ baseRows: ten, multiplier: 20, distributeRoots: true })
      }
    ],
    rounds: 6
  })
};

const scenario = SCENARIOS[scenarioName];
if (!scenario) {
  console.error('scenarios:', Object.keys(SCENARIOS).join(', '));
  process.exit(1);
}
const spec = scenario();

// Normalize every scenario to a list of {core, rows} work items.
let work;
if (spec.coreSets) {
  work = spec.coreSets.map((s) => ({
    core: createCore({ entities: s.entities }),
    rows: s.rows
  }));
} else if (spec.rowSets) {
  const core = createCore({ entities: spec.entities });
  work = spec.rowSets.map((rows) => ({ core, rows }));
} else {
  work = [{ core: createCore({ entities: spec.entities }), rows: spec.rows }];
}
const totalRows = work.reduce((n, w) => n + w.rows.length, 0);

for (let i = 0; i < 60; i++) {
  for (const w of work) w.core.createFromDatabase(w.rows);
}

const runRounds = (rounds) => {
  const t = process.hrtime.bigint();
  for (let i = 0; i < rounds; i++) {
    for (let j = 0; j < work.length; j++) {
      work[j].core.createFromDatabase(work[j].rows);
    }
  }
  return Number(process.hrtime.bigint() - t) / 1e6;
};

/* Samples must be long enough that garbage collection is amortized inside
 * every one of them. Short samples make allocation-heavy scenarios bimodal -
 * a sample either contains a collection or it doesn't - and the median then
 * reports which side of the coin flip won rather than how fast the code is.
 */
const TARGET_SAMPLE_MS = Number(process.env.BENCH_TARGET_MS || 250);
let rounds = spec.rounds;
for (let probe = 0; probe < 12; probe++) {
  const ms = runRounds(rounds);
  if (ms >= TARGET_SAMPLE_MS * 0.7) {
    break;
  }
  rounds = Math.max(rounds + 1, Math.ceil((rounds * TARGET_SAMPLE_MS) / ms));
}

const samples = [];
for (let s = 0; s < SAMPLES; s++) {
  if (global.gc) global.gc();
  samples.push(runRounds(rounds));
}
samples.sort((a, b) => a - b);
const med = samples[Math.floor(samples.length / 2)];
const perRowNs = (med * 1e6) / (rounds * totalRows);
console.log(
  JSON.stringify({
    scenario: scenarioName,
    rows: totalRows,
    shapes: work.length,
    rounds,
    medMs: Number(med.toFixed(4)),
    minMs: Number(samples[0].toFixed(4)),
    perRowNs: Number(perRowNs.toFixed(2)),
    rowsPerSec: Math.round((totalRows * rounds * 1000) / med)
  })
);
