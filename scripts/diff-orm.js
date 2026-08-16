/* eslint-disable no-console */
/* Differential test for the ORM helper utilities: runs the same models through
 * two builds of `orm` and compares every returned fragment, value array and
 * named-parameter object exactly. The helpers' contract turns on subtle value
 * tests (`undefined` is skipped by INSERT/UPDATE, `null` is additionally
 * skipped by WHERE), so this covers each of those states per column plus the
 * wide-table fallback and awkward property names.
 *
 *   node scripts/diff-orm.js <ormDirA> <ormDirB>
 */
const path = require('path');

const dirA = path.resolve(process.argv[2] || '.perf-ref/dist-head/src');
const dirB = path.resolve(process.argv[3] || './dist/src');
const A = require(path.join(dirA, 'orm.js'));
const B = require(path.join(dirB, 'orm.js'));

const load = (p) => require(path.resolve(__dirname, '..', p));
const orderEntities = load('dist/test-utils/order/entities').entities;
const { Order } = load('dist/test-utils/order/models/order');
const orderMoreEntities = load('dist/test-utils/order-more/entities').entities;

const fakeDb = {
  $config: { pgp: true },
  many: () => Promise.resolve([]),
  any: () => Promise.resolve([]),
  result: () => Promise.resolve({ rows: [], fields: [] }),
  none: () => Promise.resolve()
};

/* A deliberately awkward entity: more columns than the bit-mask limit, a
 * property name that is not a valid identifier, and one that collides with an
 * Object.prototype member.
 */
const wideColumns = [];
for (let i = 0; i < 40; i++) {
  wideColumns.push('col_' + i);
}
wideColumns.push({ column: 'weird_one', property: 'not-an-identifier' });
wideColumns.push({ column: 'ctor_col', property: 'constructor' });
wideColumns.push({ column: 'proto_col', property: 'hasOwnProperty' });
class Wide {
  constructor(props) {
    Object.assign(this, props);
  }
}
class Wides {
  constructor({ models }) {
    this.models = models;
  }
}
const wideEntity = {
  tableName: 'wide',
  columns: wideColumns,
  Model: Wide,
  Collection: Wides
};

const narrowColumns = [
  'id',
  { column: 'odd_name', property: 'has space' },
  'value_a',
  'value_b'
];
class Narrow {
  constructor(props) {
    Object.assign(this, props);
  }
}
class Narrows {
  constructor({ models }) {
    this.models = models;
  }
}
const narrowEntity = {
  tableName: 'narrow',
  columns: narrowColumns,
  Model: Narrow,
  Collection: Narrows
};

const makeOrm = (mod, entities) => mod.create({ entities, db: fakeDb });

const stable = (value) => {
  if (value === void 0) {
    return '<undefined>';
  }
  return JSON.stringify(value, (k, v) => {
    if (v === void 0) {
      return '<undefined>';
    }
    if (typeof v === 'bigint') {
      return 'bigint:' + v.toString();
    }
    if (typeof v === 'number' && Number.isNaN(v)) {
      return '<nan>';
    }
    return v;
  });
};

const VALUE_STATES = [
  ['set', (i) => 'v' + i],
  ['undefined', () => void 0],
  ['null', () => null],
  ['zero', () => 0],
  ['empty', () => ''],
  ['false', () => false],
  ['nan', () => Number.NaN],
  ['date', () => new Date(1700000000000)]
];

const buildModels = (Model, propertyNames) => {
  const models = [];
  // all-set, all-undefined, all-null baselines
  for (const [, make] of VALUE_STATES) {
    const props = {};
    for (let i = 0; i < propertyNames.length; i++) {
      props[propertyNames[i]] = make(i);
    }
    models.push(new Model(props));
  }
  // one column in each state at a time, rest set
  for (let target = 0; target < propertyNames.length; target++) {
    for (const [, make] of VALUE_STATES) {
      const props = {};
      for (let i = 0; i < propertyNames.length; i++) {
        props[propertyNames[i]] = i === target ? make(i) : 'v' + i;
      }
      models.push(new Model(props));
    }
  }
  // a deterministic mixture
  for (let seed = 0; seed < 12; seed++) {
    const props = {};
    for (let i = 0; i < propertyNames.length; i++) {
      const [, make] = VALUE_STATES[(i * 7 + seed * 3) % VALUE_STATES.length];
      props[propertyNames[i]] = make(i);
    }
    models.push(new Model(props));
  }
  return models;
};

let checks = 0;
let failures = 0;

const compareHelper = (label, fnA, fnB, args) => {
  checks++;
  let ra;
  let rb;
  try {
    ra = { ok: true, value: fnA(...args) };
  } catch (e) {
    ra = { ok: false, value: e.constructor.name + ': ' + e.message };
  }
  try {
    rb = { ok: true, value: fnB(...args) };
  } catch (e) {
    rb = { ok: false, value: e.constructor.name + ': ' + e.message };
  }
  const sa = (ra.ok ? 'ok ' : 'err ') + stable(ra.value);
  const sb = (rb.ok ? 'ok ' : 'err ') + stable(rb.value);
  if (sa !== sb) {
    failures++;
    if (failures <= 15) {
      console.log(`FAIL ${label}\n    A: ${sa}\n    B: ${sb}`);
    }
  }
};

const runSet = (name, entities, Model, propertyNames) => {
  const ormA = makeOrm(A, entities);
  const ormB = makeOrm(B, entities);
  const models = buildModels(Model, propertyNames);
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const tag = `${name}[${i}]`;
    compareHelper(
      `${tag} getSqlInsertParts`,
      ormA.getSqlInsertParts,
      ormB.getSqlInsertParts,
      [model]
    );
    compareHelper(
      `${tag} getSqlUpdateParts`,
      ormA.getSqlUpdateParts,
      ormB.getSqlUpdateParts,
      [model]
    );
    compareHelper(
      `${tag} getSqlUpdateParts(on)`,
      ormA.getSqlUpdateParts,
      ormB.getSqlUpdateParts,
      [model, propertyNames[0]]
    );
    compareHelper(
      `${tag} getMatchingParts`,
      ormA.getMatchingParts,
      ormB.getMatchingParts,
      [model]
    );
    compareHelper(
      `${tag} getMatchingPartsObject`,
      ormA.getMatchingPartsObject,
      ormB.getMatchingPartsObject,
      [model]
    );
    compareHelper(
      `${tag} getSqlColumnForPropertyName`,
      ormA.getSqlColumnForPropertyName,
      ormB.getSqlColumnForPropertyName,
      [model, propertyNames[1 % propertyNames.length]]
    );
    compareHelper(
      `${tag} getValueBySqlColumn`,
      ormA.getValueBySqlColumn,
      ormB.getValueBySqlColumn,
      [model, 'id']
    );
  }
};

const orderProps = orderEntities
  .find((e) => e.tableName === 'order')
  .columns.map((c) =>
    typeof c === 'string'
      ? c.replace(/_([a-z])/g, (m, x) => x.toUpperCase())
      : c.property || c.column.replace(/_([a-z])/g, (m, x) => x.toUpperCase())
  );

runSet('order', orderEntities, Order, orderProps);
runSet(
  'wide',
  [wideEntity],
  Wide,
  wideColumns.map((c) =>
    typeof c === 'string'
      ? c.replace(/_([a-z])/g, (m, x) => x.toUpperCase())
      : c.property
  )
);
runSet(
  'narrow',
  [narrowEntity],
  Narrow,
  narrowColumns.map((c) =>
    typeof c === 'string'
      ? c.replace(/_([a-z])/g, (m, x) => x.toUpperCase())
      : c.property
  )
);

// getNewWith round-trips column names back into a model.
{
  const ormA = makeOrm(A, orderEntities);
  const ormB = makeOrm(B, orderEntities);
  const base = new Order({ id: 1 });
  compareHelper(
    'order getNewWith',
    (m, c, v) => {
      const out = ormA.getNewWith(m, c, v);
      return { ...out };
    },
    (m, c, v) => {
      const out = ormB.getNewWith(m, c, v);
      return { ...out };
    },
    [base, ['id', 'email', 'not_a_column'], [7, 'a@b.c', 'x']]
  );
}

console.log(
  `\n${checks - failures}/${checks} helper results identical` +
    (failures ? ` - ${failures} FAILURES` : '')
);
process.exit(failures ? 1 : 0);
