/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const benchPath = path.resolve(__dirname, 'bench-core.js');
const source = fs.readFileSync(benchPath, 'utf8');

const failures = [];

const requirePattern = (pattern, message) => {
  if (!pattern.test(source)) {
    failures.push(message);
  }
};

// Guardrail: keep broad fixture-mixing scenarios.
requirePattern(
  /label:\s*'stress\/mixed-fixtures x80'/,
  "Missing stress scenario label 'stress/mixed-fixtures x80'."
);
requirePattern(
  /label:\s*'stress\/mixed-sparse x80'/,
  "Missing stress scenario label 'stress/mixed-sparse x80'."
);

// Guardrail: keep heterogeneous input families and adversarial ordering.
requirePattern(
  /baseRowsSet:\s*\[[^\]]*seven[^\]]*eight[^\]]*ten[^\]]*eleven[^\]]*\]/s,
  'Missing heterogeneous baseRowsSet coverage over multiple fixtures.'
);
requirePattern(
  /shuffleRows:\s*true/,
  'Missing shuffled-row stress coverage (shuffleRows: true).'
);

if (failures.length > 0) {
  console.error('\nBenchmark scenario guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error(
    '\nThis guard prevents benchmark drift back to narrow, overfit scenarios.'
  );
  process.exit(1);
}

console.log('Benchmark scenario guard passed.');
