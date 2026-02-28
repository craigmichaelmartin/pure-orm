/* eslint-disable no-console */
const { createCore } = require('../dist/src/core');
const { entities: orderEntities } = require('../dist/test-utils/order/entities');
const { entities: blogEntities } = require('../dist/test-utils/blog/entities');
const { entities: orderMoreEntities } = require('../dist/test-utils/order-more/entities');
const { entities: nineEntities } = require('../dist/test-utils/nine/entities');
const { entities: fiveEntities } = require('../dist/test-utils/five/entities');
const { entities: sixEntities } = require('../dist/test-utils/six/entities');
const { entities: twelveEntities } = require('../dist/test-utils/twelve/entities');
const { entities: thirteenEntities } = require('../dist/test-utils/thirteen/entities');
const { entities: fourteenEntities } = require('../dist/test-utils/fourteen/entities');

const two = require('../dist/test-utils/two/results');
const three = require('../dist/test-utils/three/results');
const one = require('../dist/test-utils/one/results.json');
const four = require('../dist/test-utils/four/results.json');
const five = require('../dist/test-utils/five/results.json');
const six = require('../dist/test-utils/six/results.json');
const seven = require('../dist/test-utils/seven/results.json');
const eight = require('../dist/test-utils/eight/results.json');
const nine = require('../dist/test-utils/nine/results.json');
const ten = require('../dist/test-utils/ten/results.json');
const eleven = require('../dist/test-utils/eleven/results.json');
const twelve = require('../dist/test-utils/twelve/results.json');
const thirteen = require('../dist/test-utils/thirteen/results.json');
const fourteen = require('../dist/test-utils/fourteen/results.json');

const FIXTURE_CASES = [
  { label: 'order/one', entities: orderEntities, rows: one },
  { label: 'blog/two', entities: blogEntities, rows: two },
  { label: 'blog/three', entities: blogEntities, rows: three },
  { label: 'order-more/four', entities: orderMoreEntities, rows: four },
  { label: 'five/five', entities: fiveEntities, rows: five },
  { label: 'six/six', entities: sixEntities, rows: six },
  { label: 'order-more/seven', entities: orderMoreEntities, rows: seven },
  { label: 'order-more/eight', entities: orderMoreEntities, rows: eight },
  { label: 'nine/nine', entities: nineEntities, rows: nine },
  { label: 'order-more/ten', entities: orderMoreEntities, rows: ten },
  { label: 'order-more/eleven', entities: orderMoreEntities, rows: eleven },
  { label: 'twelve/twelve', entities: twelveEntities, rows: twelve },
  { label: 'thirteen/thirteen', entities: thirteenEntities, rows: thirteen },
  { label: 'fourteen/fourteen', entities: fourteenEntities, rows: fourteen }
];

const STRESS_SCENARIOS = [
  {
    label: 'stress/same-root x120',
    entities: orderMoreEntities,
    baseRows: eleven,
    multiplier: 120,
    distributeRoots: false,
    sparseJoins: false,
    rounds: 5
  },
  {
    label: 'stress/many-roots x120',
    entities: orderMoreEntities,
    baseRows: eleven,
    multiplier: 120,
    distributeRoots: true,
    sparseJoins: false,
    rounds: 5
  },
  {
    label: 'stress/sparse-joins x120',
    entities: orderMoreEntities,
    baseRows: eleven,
    multiplier: 120,
    distributeRoots: false,
    sparseJoins: true,
    rounds: 8
  },
  {
    label: 'stress/sparse-many x120',
    entities: orderMoreEntities,
    baseRows: eleven,
    multiplier: 120,
    distributeRoots: true,
    sparseJoins: true,
    rounds: 8
  }
];

const sparsifyRow = ({ row, rootTablePrefix }) => {
  const sparse = {};
  for (const key in row) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) {
      continue;
    }
    sparse[key] = key.startsWith(`${rootTablePrefix}#`) ? row[key] : null;
  }
  return sparse;
};

const buildStressRows = ({
  baseRows,
  multiplier,
  distributeRoots,
  sparseJoins = false
}) => {
  const rows = [];
  const firstKey = Object.keys(baseRows[0]).find((k) => k.endsWith('#id'));
  const rootTable = firstKey ? firstKey.split('#')[0] : 'order';
  for (let i = 0; i < multiplier; i++) {
    for (const row of baseRows) {
      const base = sparseJoins
        ? sparsifyRow({ row, rootTablePrefix: rootTable })
        : row;
      if (distributeRoots) {
        const cloned = { ...base };
        const rootIdKey = `${rootTable}#id`;
        cloned[rootIdKey] = row[rootIdKey] + (i + 1) * 10000;
        rows.push(cloned);
      } else {
        rows.push(base);
      }
    }
  }
  return rows;
};

const runBench = ({ label, rows, rounds, core }) => {
  // Warm JIT and hidden classes before timing.
  core.createFromDatabase(rows);

  const start = process.hrtime.bigint();
  for (let i = 0; i < rounds; i++) {
    core.createFromDatabase(rows);
  }
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  const perIterMs = elapsedMs / rounds;
  const rowsPerSecond = (rows.length * rounds * 1000) / elapsedMs;
  return { label, rows: rows.length, rounds, elapsedMs, perIterMs, rowsPerSecond };
};

const format = (n, decimals = 2) => n.toFixed(decimals);
const geometricMean = (values) => {
  const positives = values.filter((v) => v > 0);
  if (positives.length === 0) {
    return 0;
  }
  let sum = 0;
  for (let i = 0; i < positives.length; i++) {
    sum += Math.log(positives[i]);
  }
  return Math.exp(sum / positives.length);
};

const main = () => {
  console.log('Pure ORM core.createFromDatabase benchmark');
  console.log('Coverage: all core.spec test-utils fixtures + stress scenarios\n');

  const fixtureResults = FIXTURE_CASES.map((fixture) => {
    const core = createCore({ entities: fixture.entities });
    const rounds = 200;
    return runBench({
      label: fixture.label,
      rows: fixture.rows,
      rounds,
      core
    });
  });

  console.log('Fixture scenarios');
  for (const r of fixtureResults) {
    console.log(
      `${r.label.padEnd(22)} | rows=${String(r.rows).padStart(4)} | rounds=${String(
        r.rounds
      ).padStart(3)} | ${format(r.perIterMs, 4)} ms/iter | ${format(
        r.rowsPerSecond,
        0
      )} rows/sec`
    );
  }
  const fixtureGeomean = geometricMean(fixtureResults.map((r) => r.rowsPerSecond));
  console.log(`fixture geomean rows/sec: ${format(fixtureGeomean, 0)}\n`);

  const stressResults = STRESS_SCENARIOS.map((scenario) => {
    const core = createCore({ entities: scenario.entities });
    return runBench({
      label: scenario.label,
      rows: buildStressRows(scenario),
      rounds: scenario.rounds,
      core
    });
  });

  console.log('Stress scenarios');
  for (const r of stressResults) {
    console.log(
      `${r.label.padEnd(22)} | rows=${String(r.rows).padStart(5)} | rounds=${String(
        r.rounds
      ).padStart(2)} | ${format(r.perIterMs)} ms/iter | ${format(
        r.rowsPerSecond,
        0
      )} rows/sec`
    );
  }
  const stressGeomean = geometricMean(stressResults.map((r) => r.rowsPerSecond));
  console.log(`stress geomean rows/sec:  ${format(stressGeomean, 0)}`);
};

main();
