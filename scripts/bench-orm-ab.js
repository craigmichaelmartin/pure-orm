/* eslint-disable no-console */
/* A/B for the ORM helper utilities.
 *   node --expose-gc scripts/bench-orm-ab.js <ormDirA> <ormDirB>
 */
const path = require('path');

const dirs = [
  path.resolve(process.argv[2] || '.perf-ref/dist-head/src'),
  path.resolve(process.argv[3] || './dist/src')
];
const load = (p) => require(path.resolve(__dirname, '..', p));
const orderEntities = load('dist/test-utils/order/entities').entities;
const { Order } = load('dist/test-utils/order/models/order');
const kujoEntities = load('dist/test-utils/kujo/entities').entities;
const { Order: KujoOrder } = load('dist/test-utils/kujo/orders');

const fakeDb = {
  $config: { pgp: true },
  many: () => Promise.resolve([]),
  any: () => Promise.resolve([]),
  result: () => Promise.resolve({ rows: [], fields: [] }),
  none: () => Promise.resolve()
};

const models = Array.from({ length: 32 }, (_, i) => {
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

/* kujo's order entity is 46 columns wide - past the bit-mask limit - so these
 * run the wide-table shape-key path the 24-column models above never touch.
 */
const wideModels = Array.from({ length: 32 }, (_, i) => {
  const ts = 1700000000000 + i * 86400000;
  return new KujoOrder({
    id: i + 1,
    customerId: 5000 + (i % 9),
    financialStatusId: (i % 4) + 1,
    shippingAddressId: 9000 + i,
    billingAddressId: i % 2 === 0 ? 9000 + i : 9500 + i,
    shippingFirstName: `First${i % 5}`,
    shippingLastName: `Last${i % 5}`,
    shopifyId: `${4000000000 + i}`,
    email: `wide${i}@example.com`,
    createdDate: new Date(ts),
    updatedDate: new Date(ts + 2000),
    subtotalPrice: `${80 + i}`,
    totalPrice: `${85 + i}`,
    totalTax: `${i % 7}`,
    orderStatusUrl: `https://checkout.example.com/orders/${i}/status`,
    utmSourceId: (i % 4) + 1,
    cancelled: i % 11 === 0
  });
});

const CASES = [
  ['getSqlInsertParts', (o, i) => o.getSqlInsertParts(models[i & 31])],
  ['getSqlUpdateParts', (o, i) => o.getSqlUpdateParts(models[i & 31], 'id')],
  ['getMatchingParts', (o, i) => o.getMatchingParts(models[i & 31])],
  [
    'getMatchingPartsObject',
    (o, i) => o.getMatchingPartsObject(models[i & 31])
  ],
  [
    'getSqlInsertParts-wide46',
    (o, i) => o.getSqlInsertParts(wideModels[i & 31]),
    'kujo'
  ],
  [
    'getSqlUpdateParts-wide46',
    (o, i) => o.getSqlUpdateParts(wideModels[i & 31], 'id'),
    'kujo'
  ],
  [
    'getMatchingParts-wide46',
    (o, i) => o.getMatchingParts(wideModels[i & 31]),
    'kujo'
  ]
];

const ITERS = 400000;
const SAMPLES = 9;

const measure = (orm, fn) => {
  for (let i = 0; i < ITERS; i++) fn(orm, i);
  const samples = [];
  for (let s = 0; s < SAMPLES; s++) {
    if (global.gc) global.gc();
    const t = process.hrtime.bigint();
    for (let i = 0; i < ITERS; i++) fn(orm, i);
    samples.push(Number(process.hrtime.bigint() - t) / ITERS);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
};

const orms = dirs.map((d) =>
  require(path.join(d, 'orm.js')).create({
    entities: orderEntities,
    db: fakeDb
  })
);
const kujoOrms = dirs.map((d) =>
  require(path.join(d, 'orm.js')).create({
    entities: kujoEntities,
    db: fakeDb
  })
);

console.log(`A = ${dirs[0]}\nB = ${dirs[1]}\n`);
let logSum = 0;
for (const [label, fn, which] of CASES) {
  const pair = which === 'kujo' ? kujoOrms : orms;
  const a = measure(pair[0], fn);
  const b = measure(pair[1], fn);
  logSum += Math.log(a / b);
  console.log(
    `${label.padEnd(24)} A=${a.toFixed(1).padStart(7)} ns/op  B=${b
      .toFixed(1)
      .padStart(7)} ns/op  ${(a / b).toFixed(3)}x`
  );
}
console.log(
  `\nGEOMEAN speedup: ${Math.exp(logSum / CASES.length).toFixed(3)}x`
);
