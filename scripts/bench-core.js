/* eslint-disable no-console */
const { createCore } = require('../dist/src/core');
const { entities } = require('../dist/test-utils/order-more/entities');
const eleven = require('../dist/test-utils/eleven/results.json');

const core = createCore({ entities });

const SCENARIOS = [
  { label: 'same-root x40', multiplier: 40, distributeRoots: false, rounds: 8 },
  { label: 'same-root x120', multiplier: 120, distributeRoots: false, rounds: 5 },
  { label: 'same-root x240', multiplier: 240, distributeRoots: false, rounds: 3 },
  { label: 'many-roots x40', multiplier: 40, distributeRoots: true, rounds: 8 },
  { label: 'many-roots x120', multiplier: 120, distributeRoots: true, rounds: 5 },
  { label: 'many-roots x240', multiplier: 240, distributeRoots: true, rounds: 3 }
];

const buildRows = ({ multiplier, distributeRoots }) => {
  const rows = [];
  for (let i = 0; i < multiplier; i++) {
    for (const row of eleven) {
      if (!distributeRoots) {
        rows.push(row);
        continue;
      }
      const cloned = { ...row };
      cloned['order#id'] = row['order#id'] + (i + 1) * 10000;
      rows.push(cloned);
    }
  }
  return rows;
};

const runScenario = ({ label, rounds, ...datasetConfig }) => {
  const rows = buildRows(datasetConfig);
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

const main = () => {
  console.log('Pure ORM core.createFromDatabase benchmark');
  console.log(`Fixture: order-more/eleven (${eleven.length} row join base)\n`);

  const results = SCENARIOS.map(runScenario);

  for (const r of results) {
    console.log(
      `${r.label.padEnd(18)} | rows=${String(r.rows).padStart(5)} | rounds=${String(
        r.rounds
      ).padStart(2)} | ${format(r.perIterMs)} ms/iter | ${format(
        r.rowsPerSecond,
        0
      )} rows/sec`
    );
  }
};

main();
