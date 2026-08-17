/* eslint-disable no-console */
/* Drives scripts/bench-ab.js once per (implementation, scenario) pair in a
 * fresh process, alternating A/B so that machine drift hits both sides.
 */
const { execFileSync } = require('child_process');
const path = require('path');

const SCENARIOS = process.env.BENCH_SCENARIOS
  ? process.env.BENCH_SCENARIOS.split(',')
  : [
      'same-root',
      'many-roots',
      'mixed-fixtures',
      'sparse-joins',
      'sparse-many',
      'blog-three',
      'thirteen',
      'six',
      'composite-pk',
      'composite-child',
      'tiny-1row',
      'tiny-24row',
      'multi-shape',
      'multi-core',
      'kujo-product-page',
      'kujo-wholesale',
      'kujo-account-orders',
      'kujo-parcel-one',
      'kujo-page'
    ];

const A = process.argv[2] || '.perf-ref/core-head.js';
const B = process.argv[3] || './dist/src/core';
const REPEATS = Number(process.env.BENCH_REPEATS || 3);

const NODE_ARGS = (process.env.BENCH_NODE_ARGS || '--expose-gc')
  .split(' ')
  .filter(Boolean);

const runOne = (core, scenario) => {
  const out = execFileSync(
    process.execPath,
    [...NODE_ARGS, path.resolve(__dirname, 'bench-ab.js'), core, scenario],
    { encoding: 'utf8', cwd: path.resolve(__dirname, '..') }
  );
  return JSON.parse(out);
};

console.log(`A = ${A}`);
console.log(`B = ${B}`);
console.log('');
let logSum = 0;
let count = 0;
for (const scenario of SCENARIOS) {
  const aRuns = [];
  const bRuns = [];
  for (let r = 0; r < REPEATS; r++) {
    aRuns.push(runOne(A, scenario).perRowNs);
    bRuns.push(runOne(B, scenario).perRowNs);
  }
  /* Take the best repeat rather than the median: unrelated load on the machine
   * can only ever add time, so the minimum is the least contaminated estimate.
   */
  const a = Math.min(...aRuns);
  const b = Math.min(...bRuns);
  const speedup = a / b;
  logSum += Math.log(speedup);
  count++;
  const delta = ((b - a) / a) * 100;
  console.log(
    `${scenario.padEnd(16)} A=${a.toFixed(1).padStart(8)} ns/row  B=${b
      .toFixed(1)
      .padStart(8)} ns/row  ${speedup.toFixed(3)}x  (${
      delta > 0 ? '+' : ''
    }${delta.toFixed(1)}% time)`
  );
}
console.log(
  `\nGEOMEAN speedup (B vs A): ${Math.exp(logSum / count).toFixed(3)}x`
);
