/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createCore } = require('../dist/src/core');
const { create: createOrm } = require('../dist/src/orm');
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
const { Order } = require('../dist/test-utils/order/models/order');

const SAMPLE_COUNT = Number(process.env.BENCH_SAMPLES || 5);
const HELPER_ITERATIONS = Number(process.env.BENCH_HELPER_ITERS || 300000);
const SAVE_BASELINE_PATH = process.env.BENCH_SAVE_BASELINE || '';
const COMPARE_BASELINE_PATH = process.env.BENCH_COMPARE_BASELINE || '';
const BENCH_SEED = Number(process.env.BENCH_SEED || 1337);

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
  },
  {
    label: 'stress/unstable-order x120',
    entities: orderMoreEntities,
    baseRows: eleven,
    multiplier: 120,
    distributeRoots: false,
    unstableColumnOrder: true,
    rounds: 8
  },
  {
    label: 'stress/unstable-many x120',
    entities: orderMoreEntities,
    baseRows: eleven,
    multiplier: 120,
    distributeRoots: true,
    unstableColumnOrder: true,
    rounds: 8
  },
  {
    label: 'stress/mixed-fixtures x80',
    entities: orderMoreEntities,
    baseRowsSet: [seven, eight, ten, eleven],
    multiplier: 80,
    distributeRoots: true,
    sparseJoins: false,
    shuffleRows: true,
    rounds: 6
  },
  {
    label: 'stress/mixed-sparse x80',
    entities: orderMoreEntities,
    baseRowsSet: [seven, eight, ten, eleven],
    multiplier: 80,
    distributeRoots: true,
    sparseJoins: true,
    shuffleRows: true,
    rounds: 8
  },
  {
    label: 'stress/composite-pk x120',
    entities: null,
    baseRows: null,
    multiplier: 120,
    distributeRoots: false,
    compositePk: true,
    rounds: 8
  }
];

const createRng = (seed) => {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const shuffleInPlace = (items, random) => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
};

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

const reorderRowKeys = (row) => {
  const keys = Object.keys(row);
  const reordered = {};
  for (let i = 0; i < keys.length; i++) {
    const idx = (i * 7 + 3) % keys.length;
    const key = keys[idx];
    reordered[key] = row[key];
  }
  return reordered;
};

const createCompositePkScenario = ({ multiplier }) => {
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

const buildStressRows = ({
  baseRows,
  baseRowsSet,
  multiplier,
  distributeRoots,
  sparseJoins = false,
  unstableColumnOrder = false,
  shuffleRows = false,
  rng
}) => {
  const sourceRows = baseRowsSet ? baseRowsSet.flat() : baseRows;
  const rows = [];
  const firstKey = Object.keys(sourceRows[0]).find((k) => k.endsWith('#id'));
  const rootTable = firstKey ? firstKey.split('#')[0] : 'order';
  for (let i = 0; i < multiplier; i++) {
    for (const row of sourceRows) {
      let base = sparseJoins ? sparsifyRow({ row, rootTablePrefix: rootTable }) : row;
      if (unstableColumnOrder) {
        base = reorderRowKeys(base);
      }
      const cloned = { ...base };
      if (distributeRoots) {
        const rootIdKey = `${rootTable}#id`;
        cloned[rootIdKey] = row[rootIdKey] + (i + 1) * 10000;
      }
      rows.push(cloned);
    }
  }
  if (shuffleRows && rows.length > 1) {
    shuffleInPlace(rows, rng || Math.random);
  }
  return rows;
};

const runBench = ({ label, rows, rounds, core }) => {
  // Warm JIT and hidden classes before timing.
  core.createFromDatabase(rows);
  const samples = [];
  for (let sample = 0; sample < SAMPLE_COUNT; sample++) {
    if (global.gc) {
      global.gc();
    }
    const start = process.hrtime.bigint();
    for (let i = 0; i < rounds; i++) {
      core.createFromDatabase(rows);
    }
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    samples.push(elapsedMs);
  }
  const sortedSamples = [...samples].sort((a, b) => a - b);
  const medianElapsedMs = sortedSamples[Math.floor(sortedSamples.length / 2)];
  const minElapsedMs = sortedSamples[0];
  const maxElapsedMs = sortedSamples[sortedSamples.length - 1];
  const meanElapsedMs = samples.reduce((acc, n) => acc + n, 0) / samples.length;
  const perIterMs = medianElapsedMs / rounds;
  const rowsPerSecond = (rows.length * rounds * 1000) / medianElapsedMs;
  return {
    label,
    rows: rows.length,
    rounds,
    samples: SAMPLE_COUNT,
    medianElapsedMs,
    meanElapsedMs,
    minElapsedMs,
    maxElapsedMs,
    perIterMs,
    rowsPerSecond
  };
};

const format = (n, decimals = 2) => n.toFixed(decimals);
const formatPercent = (n) => `${n > 0 ? '+' : ''}${format(n, 2)}%`;
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
const indexByLabel = (items) => {
  const index = new Map();
  for (let i = 0; i < items.length; i++) {
    index.set(items[i].label, items[i]);
  }
  return index;
};

const printDeltaTable = ({ title, currentItems, baselineItems, metric, unit }) => {
  const baselineByLabel = indexByLabel(baselineItems);
  console.log(`\n${title}`);
  for (let i = 0; i < currentItems.length; i++) {
    const current = currentItems[i];
    const baseline = baselineByLabel.get(current.label);
    if (!baseline || !baseline[metric]) {
      console.log(`${current.label.padEnd(30)} | baseline: n/a`);
      continue;
    }
    const baselineValue = baseline[metric];
    const currentValue = current[metric];
    const deltaPct = ((currentValue - baselineValue) / baselineValue) * 100;
    console.log(
      `${current.label.padEnd(30)} | ${format(
        baselineValue,
        metric === 'rowsPerSecond' || metric === 'opsPerSec' ? 0 : 2
      )} -> ${format(
        currentValue,
        metric === 'rowsPerSecond' || metric === 'opsPerSec' ? 0 : 2
      )} ${unit} (${formatPercent(deltaPct)})`
    );
  }
};

const saveBaseline = ({ outputPath, payload }) => {
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(payload, null, 2));
  console.log(`\nSaved baseline: ${resolved}`);
};

const loadBaseline = (inputPath) => {
  const resolved = path.resolve(inputPath);
  const raw = fs.readFileSync(resolved, 'utf8');
  return { resolved, data: JSON.parse(raw) };
};

const main = () => {
  const rng = createRng(BENCH_SEED);
  console.log('Pure ORM core.createFromDatabase benchmark');
  console.log('Coverage: all core.spec test-utils fixtures + stress scenarios\n');
  console.log(
    `Sampling: ${SAMPLE_COUNT} samples/scenario, ${
      global.gc ? 'GC enabled' : 'GC not enabled'
    }, seed=${BENCH_SEED}`
  );
  if (SAVE_BASELINE_PATH) {
    console.log(`Save baseline: ${path.resolve(SAVE_BASELINE_PATH)}`);
  }
  if (COMPARE_BASELINE_PATH) {
    console.log(`Compare baseline: ${path.resolve(COMPARE_BASELINE_PATH)}`);
  }
  console.log('');

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
      )} rows/sec | med=${format(r.medianElapsedMs, 2)}ms mean=${format(
        r.meanElapsedMs,
        2
      )}ms min=${format(r.minElapsedMs, 2)}ms max=${format(r.maxElapsedMs, 2)}ms`
    );
  }
  const fixtureGeomean = geometricMean(fixtureResults.map((r) => r.rowsPerSecond));
  console.log(`fixture geomean rows/sec: ${format(fixtureGeomean, 0)}\n`);

  const stressResults = STRESS_SCENARIOS.map((scenario) => {
    let entities = scenario.entities;
    let rows;
    if (scenario.compositePk) {
      const composite = createCompositePkScenario({ multiplier: scenario.multiplier });
      entities = composite.entities;
      rows = composite.rows;
    } else {
      rows = buildStressRows({ ...scenario, rng });
    }
    const core = createCore({ entities });
    return runBench({
      label: scenario.label,
      rows,
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
      )} rows/sec | med=${format(r.medianElapsedMs, 2)}ms mean=${format(
        r.meanElapsedMs,
        2
      )}ms min=${format(r.minElapsedMs, 2)}ms max=${format(r.maxElapsedMs, 2)}ms`
    );
  }
  const stressGeomean = geometricMean(stressResults.map((r) => r.rowsPerSecond));
  console.log(`stress geomean rows/sec:  ${format(stressGeomean, 0)}`);

  const fakeDb = {
    $config: { pgp: true },
    many: () => Promise.resolve([]),
    any: () => Promise.resolve([]),
    result: () => Promise.resolve({ rows: [], fields: [{ name: 'order#id' }] }),
    none: () => Promise.resolve()
  };
  const orm = createOrm({ entities: orderEntities, db: fakeDb });
  const benchmarkOrders = Array.from({ length: 32 }, (_, i) => {
    const ts = 1700000000000 + i * 86400000;
    return new Order({
      id: i + 1,
      email: `user${i}@example.com`,
      browserIp: `127.0.0.${(i % 250) + 1}`,
      browserUserAgent: `ua-${i % 5}`,
      kujoImportedDate: new Date(ts),
      createdDate: new Date(ts - 1000),
      cancelReason: i % 7 === 0 ? 'test' : null,
      cancelledDate: i % 7 === 0 ? new Date(ts + 5000) : null,
      closedDate: null,
      processedDate: new Date(ts + 1000),
      updatedDate: new Date(ts + 2000),
      note: `n-${i}`,
      subtotalPrice: i + 1,
      taxesIncluded: i % 2 === 0,
      totalDiscounts: i % 3,
      totalPrice: i + 2,
      totalTax: i % 5,
      totalWeight: i % 11,
      orderStatusUrl: `url-${i}`,
      utmSourceId: (i % 4) + 1,
      utmMediumId: (i % 6) + 1,
      utmCampaign: `camp-${i % 3}`,
      utmContent: `content-${i % 8}`,
      utmTerm: `term-${i % 9}`
    });
  });
  const benchmarkProperties = ['updatedDate', 'email', 'totalPrice', 'utmCampaign'];
  const ormHelperScenarios = [
    {
      label: 'orm/getSqlInsertParts',
      fn: (i) => orm.getSqlInsertParts(benchmarkOrders[i & 31])
    },
    {
      label: 'orm/getSqlUpdateParts',
      fn: (i) => orm.getSqlUpdateParts(benchmarkOrders[i & 31], 'id')
    },
    {
      label: 'orm/getMatchingParts',
      fn: (i) => orm.getMatchingParts(benchmarkOrders[i & 31])
    },
    {
      label: 'orm/getMatchingPartsObject',
      fn: (i) => orm.getMatchingPartsObject(benchmarkOrders[i & 31])
    },
    {
      label: 'orm/getSqlColumnForPropertyName',
      fn: (i) =>
        orm.getSqlColumnForPropertyName(
          benchmarkOrders[i & 31],
          benchmarkProperties[i % benchmarkProperties.length]
        )
    }
  ];
  console.log('\nORM helper microbench');
  const ormHelperResults = [];
  for (const scenario of ormHelperScenarios) {
    const sampleMs = [];
    for (let sample = 0; sample < SAMPLE_COUNT; sample++) {
      scenario.fn(0);
      if (global.gc) {
        global.gc();
      }
      const start = process.hrtime.bigint();
      for (let i = 0; i < HELPER_ITERATIONS; i++) {
        scenario.fn(i);
      }
      sampleMs.push(Number(process.hrtime.bigint() - start) / 1e6);
    }
    const sorted = [...sampleMs].sort((a, b) => a - b);
    const medianMs = sorted[Math.floor(sorted.length / 2)];
    const minMs = sorted[0];
    const maxMs = sorted[sorted.length - 1];
    const meanMs = sampleMs.reduce((acc, n) => acc + n, 0) / sampleMs.length;
    const opsPerSec = (HELPER_ITERATIONS * 1000) / medianMs;
    ormHelperResults.push({
      label: scenario.label,
      medianMs,
      meanMs,
      minMs,
      maxMs,
      opsPerSec
    });
    console.log(
      `${scenario.label.padEnd(30)} | ${format(medianMs, 2)} ms total (median) | ${format(
        opsPerSec,
        0
      )} ops/sec | mean=${format(meanMs, 2)}ms min=${format(minMs, 2)}ms max=${format(
        maxMs,
        2
      )}ms`
    );
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sampleCount: SAMPLE_COUNT,
    helperIterations: HELPER_ITERATIONS,
    fixtureResults,
    stressResults,
    ormHelperResults
  };

  if (SAVE_BASELINE_PATH) {
    saveBaseline({ outputPath: SAVE_BASELINE_PATH, payload });
  }

  if (COMPARE_BASELINE_PATH) {
    const baseline = loadBaseline(COMPARE_BASELINE_PATH);
    console.log(`\nLoaded baseline: ${baseline.resolved}`);
    printDeltaTable({
      title: 'Fixture rows/sec delta vs baseline',
      currentItems: fixtureResults,
      baselineItems: baseline.data.fixtureResults || [],
      metric: 'rowsPerSecond',
      unit: 'rows/sec'
    });
    printDeltaTable({
      title: 'Stress rows/sec delta vs baseline',
      currentItems: stressResults,
      baselineItems: baseline.data.stressResults || [],
      metric: 'rowsPerSecond',
      unit: 'rows/sec'
    });
    printDeltaTable({
      title: 'ORM helper ops/sec delta vs baseline',
      currentItems: ormHelperResults,
      baselineItems: baseline.data.ormHelperResults || [],
      metric: 'opsPerSec',
      unit: 'ops/sec'
    });
  }
};

main();
