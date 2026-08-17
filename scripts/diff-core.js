/* eslint-disable no-console */
/* Differential test: runs every fixture and stress shape through two core
 * implementations and deep-compares the resulting object graphs - structure,
 * own-property order, property descriptors (enumerable/writable/configurable),
 * prototypes, symbol-keyed properties and cycle topology. Behaviour-preserving
 * refactors of createFromDatabase must produce byte-for-byte equivalent
 * graphs, and unit tests alone don't check descriptor attributes or property
 * order.
 *
 *   node scripts/diff-core.js <coreA> <coreB>
 *
 * `--logical` compares across the v4->v5 back-reference storage change: v4
 * stores a collection as an own non-enumerable string-keyed property, v5 as
 * an own symbol-keyed property (namespace `pure-orm:collection:`) behind a
 * prototype accessor. In logical mode each object's entries are normalized to
 * (string own properties in order, then collections in link order by name),
 * descriptor attributes are only compared for non-collection properties, and
 * the JSON-equivalence check - the user-visible contract - still runs
 * byte-for-byte. Prototype identity failures for accessor-bearing prototypes
 * are expected only if the two sides load different entity modules; here both
 * sides share them, so prototypes still compare by identity.
 *
 *   node scripts/diff-core.js --logical dist/orig-core.js ./dist/src/core
 */
const path = require('path');

const LOGICAL = process.argv.includes('--logical');
const coreArgs = process.argv.slice(2).filter((a) => a !== '--logical');

const COLLECTION_SYMBOL_PREFIX = 'pure-orm:collection:';
const collectionNameOfSymbol = (sym) => {
  const description = String(sym.description || '');
  return description.startsWith(COLLECTION_SYMBOL_PREFIX)
    ? description.slice(COLLECTION_SYMBOL_PREFIX.length)
    : null;
};

/* Prefix a path with `interpreted:` to load that build with function
 * construction disabled, which is the only way to reach the non-compiled
 * fallback - no unit test can otherwise execute a line of it.
 */
const requireCore = (spec) => {
  if (!spec.startsWith('interpreted:')) {
    return require(path.resolve(spec));
  }
  const resolved = require.resolve(
    path.resolve(spec.slice('interpreted:'.length))
  );
  delete require.cache[resolved];
  const RealFunction = global.Function;
  global.Function = new Proxy(RealFunction, {
    construct() {
      throw new EvalError('function construction blocked');
    },
    apply() {
      throw new EvalError('function construction blocked');
    }
  });
  try {
    return require(resolved);
  } finally {
    global.Function = RealFunction;
    delete require.cache[resolved];
  }
};

const A = requireCore(coreArgs[0] || '.perf-ref/core-head.js');
const B = requireCore(coreArgs[1] || './dist/src/core');

const load = (p) => require(path.resolve(__dirname, '..', p));

const entitySets = {
  order: load('dist/test-utils/order/entities').entities,
  blog: load('dist/test-utils/blog/entities').entities,
  orderMore: load('dist/test-utils/order-more/entities').entities,
  nine: load('dist/test-utils/nine/entities').entities,
  five: load('dist/test-utils/five/entities').entities,
  six: load('dist/test-utils/six/entities').entities,
  twelve: load('dist/test-utils/twelve/entities').entities,
  thirteen: load('dist/test-utils/thirteen/entities').entities,
  fourteen: load('dist/test-utils/fourteen/entities').entities,
  kujo: load('dist/test-utils/kujo/entities').entities
};

const kujoRows = load('dist/test-utils/kujo/rows');

const fixtures = {
  one: load('dist/test-utils/one/results.json'),
  two: load('dist/test-utils/two/results'),
  three: load('dist/test-utils/three/results'),
  four: load('dist/test-utils/four/results.json'),
  five: load('dist/test-utils/five/results.json'),
  six: load('dist/test-utils/six/results.json'),
  seven: load('dist/test-utils/seven/results.json'),
  eight: load('dist/test-utils/eight/results.json'),
  nine: load('dist/test-utils/nine/results.json'),
  ten: load('dist/test-utils/ten/results.json'),
  eleven: load('dist/test-utils/eleven/results.json'),
  twelve: load('dist/test-utils/twelve/results.json'),
  thirteen: load('dist/test-utils/thirteen/results.json'),
  fourteen: load('dist/test-utils/fourteen/results.json')
};

/* ------------------------------------------------------------------------ */
/* Deep structural comparison                                                */
/* ------------------------------------------------------------------------ */

const describeDescriptor = (d) =>
  d.get || d.set
    ? `accessor(get=${!!d.get},set=${!!d.set},e=${d.enumerable},c=${
        d.configurable
      })`
    : `data(w=${d.writable},e=${d.enumerable},c=${d.configurable})`;

const compare = (a, b, pathStr, seen, problems) => {
  if (problems.length > 20) {
    return;
  }
  if (a === b) {
    return;
  }
  const ta = typeof a;
  const tb = typeof b;
  if (ta !== tb) {
    problems.push(`${pathStr}: typeof ${ta} !== ${tb}`);
    return;
  }
  if (a === null || b === null || ta !== 'object') {
    if (ta === 'number' && Number.isNaN(a) && Number.isNaN(b)) {
      return;
    }
    problems.push(`${pathStr}: ${String(a)} !== ${String(b)}`);
    return;
  }
  const priorB = seen.get(a);
  if (priorB !== void 0) {
    // Cycle / shared reference: topology must match on both sides.
    if (priorB !== b) {
      problems.push(`${pathStr}: reference topology differs`);
    }
    return;
  }
  seen.set(a, b);

  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
    problems.push(`${pathStr}: prototype differs`);
    return;
  }
  if (a instanceof Date) {
    if (a.getTime() !== b.getTime()) {
      problems.push(
        `${pathStr}: Date ${a.toISOString()} !== ${b.toISOString()}`
      );
    }
    return;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    problems.push(`${pathStr}: array-ness differs`);
    return;
  }

  if (LOGICAL) {
    /* Normalize both storage forms to one logical view: enumerable string own
     * entries in order, plus collections as a name-keyed set. In v4 a
     * collection is an own non-enumerable string property whose *position*
     * among the own names depends on plan order (a collection created in the
     * same row as the model can precede its forward references); in v5 that
     * position does not exist at all - collections are symbol-keyed - so
     * collection order is deliberately not part of the logical contract.
     */
    const ea = logicalEntriesOf(a);
    const eb = logicalEntriesOf(b);
    const namesA = ea.plain.map((e) => e.key);
    const namesB = eb.plain.map((e) => e.key);
    if (
      namesA.length !== namesB.length ||
      namesA.some((k, i) => k !== namesB[i])
    ) {
      problems.push(
        `${pathStr}: own property names differ\n    A: ${namesA.join(
          ','
        )}\n    B: ${namesB.join(',')}`
      );
      return;
    }
    for (let i = 0; i < ea.plain.length; i++) {
      const strA = describeDescriptor(ea.plain[i].descriptor);
      const strB = describeDescriptor(eb.plain[i].descriptor);
      if (strA !== strB) {
        problems.push(
          `${pathStr}.${ea.plain[i].key}: descriptor ${strA} !== ${strB}`
        );
        continue;
      }
      if (ea.plain[i].descriptor.get || ea.plain[i].descriptor.set) {
        continue;
      }
      compare(
        ea.plain[i].value,
        eb.plain[i].value,
        `${pathStr}.${ea.plain[i].key}`,
        seen,
        problems
      );
    }
    const collectionNamesA = ea.collections.map((e) => e.key);
    const collectionNamesB = eb.collections.map((e) => e.key);
    if (
      collectionNamesA.length !== collectionNamesB.length ||
      collectionNamesA.some((k, i) => k !== collectionNamesB[i])
    ) {
      problems.push(
        `${pathStr}: collection names differ\n    A: ${collectionNamesA.join(
          ','
        )}\n    B: ${collectionNamesB.join(',')}`
      );
      return;
    }
    for (let i = 0; i < ea.collections.length; i++) {
      compare(
        ea.collections[i].value,
        eb.collections[i].value,
        `${pathStr}.${ea.collections[i].key}`,
        seen,
        problems
      );
    }
    return;
  }

  const ka = Object.getOwnPropertyNames(a);
  const kb = Object.getOwnPropertyNames(b);
  if (ka.length !== kb.length || ka.some((k, i) => k !== kb[i])) {
    problems.push(
      `${pathStr}: own property names differ\n    A: ${ka.join(
        ','
      )}\n    B: ${kb.join(',')}`
    );
    return;
  }
  const sa = Object.getOwnPropertySymbols(a);
  const sb = Object.getOwnPropertySymbols(b);
  if (sa.length !== sb.length) {
    problems.push(
      `${pathStr}: own symbol count differs (${sa.length} vs ${sb.length})`
    );
    return;
  }
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) {
      problems.push(
        `${pathStr}: own symbol order differs at ${i} (${String(
          sa[i]
        )} vs ${String(sb[i])})`
      );
      return;
    }
  }
  for (let i = 0; i < ka.length; i++) {
    const key = ka[i];
    const da = Object.getOwnPropertyDescriptor(a, key);
    const db = Object.getOwnPropertyDescriptor(b, key);
    const strA = describeDescriptor(da);
    const strB = describeDescriptor(db);
    if (strA !== strB) {
      problems.push(`${pathStr}.${key}: descriptor ${strA} !== ${strB}`);
      continue;
    }
    if (da.get || da.set) {
      continue;
    }
    compare(da.value, db.value, `${pathStr}.${key}`, seen, problems);
  }
  for (let i = 0; i < sa.length; i++) {
    const da = Object.getOwnPropertyDescriptor(a, sa[i]);
    const db = Object.getOwnPropertyDescriptor(b, sb[i]);
    const strA = describeDescriptor(da);
    const strB = describeDescriptor(db);
    const label = `${pathStr}[${String(sa[i])}]`;
    if (strA !== strB) {
      problems.push(`${label}: descriptor ${strA} !== ${strB}`);
      continue;
    }
    if (da.get || da.set) {
      continue;
    }
    compare(da.value, db.value, label, seen, problems);
  }
};

/* Logical view of an object's own entries for `--logical` mode. `plain` holds
 * the enumerable string-keyed entries in own order; `collections` holds
 * back-reference collections sorted by name, whichever way they are stored -
 * v4's own non-enumerable string properties, v5's namespaced own symbol
 * properties, or the v5 collision fallback (which is the v4 form).
 */
const logicalEntriesOf = (o) => {
  const plain = [];
  const collections = [];
  for (const key of Object.getOwnPropertyNames(o)) {
    const descriptor = Object.getOwnPropertyDescriptor(o, key);
    if (descriptor.enumerable === false) {
      collections.push({ key, value: descriptor.value });
    } else {
      plain.push({ key, value: descriptor.value, descriptor });
    }
  }
  for (const sym of Object.getOwnPropertySymbols(o)) {
    const name = collectionNameOfSymbol(sym);
    if (name !== null) {
      collections.push({ key: name, value: o[sym] });
    }
  }
  collections.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
  return { plain, collections };
};

const compareGraphs = (a, b, label) => {
  const problems = [];
  compare(a, b, label, new Map(), problems);
  return problems;
};

/* JSON.stringify equivalence is the user-visible contract that the
 * non-enumerable back-references exist to protect. */
const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return 'THREW: ' + e.message;
  }
};

/* ------------------------------------------------------------------------ */
/* Scenario matrix                                                           */
/* ------------------------------------------------------------------------ */

const createRng = (seed) => {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};
const shuffle = (items, random) => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const t = items[i];
    items[i] = items[j];
    items[j] = t;
  }
  return items;
};

const cases = [
  ['order/one', entitySets.order, fixtures.one],
  ['blog/two', entitySets.blog, fixtures.two],
  ['blog/three', entitySets.blog, fixtures.three],
  ['order-more/four', entitySets.orderMore, fixtures.four],
  ['five/five', entitySets.five, fixtures.five],
  ['six/six', entitySets.six, fixtures.six],
  ['order-more/seven', entitySets.orderMore, fixtures.seven],
  ['order-more/eight', entitySets.orderMore, fixtures.eight],
  ['nine/nine', entitySets.nine, fixtures.nine],
  ['order-more/ten', entitySets.orderMore, fixtures.ten],
  ['order-more/eleven', entitySets.orderMore, fixtures.eleven],
  ['twelve/twelve', entitySets.twelve, fixtures.twelve],
  ['thirteen/thirteen', entitySets.thirteen, fixtures.thirteen],
  ['fourteen/fourteen', entitySets.fourteen, fixtures.fourteen],
  /* Captured kujo workloads (test-utils/kujo/README.md); the two full-size
   * product-page captures join as direct cases below, past the derived loop.
   */
  ['kujo/product-page-mid', entitySets.kujo, kujoRows.productPageMid()],
  ['kujo/account-orders', entitySets.kujo, kujoRows.accountOrders()],
  ['kujo/parcel-tracking', entitySets.kujo, kujoRows.parcelTracking()],
  ['kujo/sizes', entitySets.kujo, kujoRows.sizes()],
  ['kujo/product-notes', entitySets.kujo, kujoRows.productNotes()]
];

const rng = createRng(20260815);

const mutateRoots = (rows, rootTable, offset) =>
  rows.map((r) => ({
    ...r,
    [`${rootTable}#id`]: r[`${rootTable}#id`] + offset
  }));

const rootTableOf = (rows) => {
  const k = Object.keys(rows[0]).find((x) => x.endsWith('#id'));
  return k ? k.split('#')[0] : null;
};

const derived = [];
for (const [label, entities, rows] of cases) {
  derived.push([label, entities, rows]);
  const rootTable = rootTableOf(rows);
  if (!rootTable) {
    continue;
  }
  // repeated roots (dedup path), distinct roots (creation path), interleaved
  // roots (out-of-order scope revisit), and reversed order.
  derived.push([`${label}#x3-same`, entities, [...rows, ...rows, ...rows]]);
  const distinct = [
    ...rows,
    ...mutateRoots(rows, rootTable, 100000),
    ...mutateRoots(rows, rootTable, 200000)
  ];
  derived.push([`${label}#x3-distinct`, entities, distinct]);
  derived.push([`${label}#interleaved`, entities, shuffle([...distinct], rng)]);
  derived.push([`${label}#reversed`, entities, [...rows].reverse()]);
  // outer-join style sparse rows
  derived.push([
    `${label}#sparse`,
    entities,
    rows.map((row) => {
      const out = {};
      for (const k in row) {
        out[k] = k.startsWith(`${rootTable}#`) ? row[k] : null;
      }
      return out;
    })
  ]);
  // string/number coercion: feed root ids back as strings
  derived.push([
    `${label}#string-ids`,
    entities,
    rows.map((row) => {
      const out = {};
      for (const k in row) {
        out[k] =
          typeof row[k] === 'number' && k.endsWith('#id')
            ? String(row[k])
            : row[k];
      }
      return out;
    })
  ]);
  derived.push([`${label}#single-row`, entities, [rows[0]]]);
  derived.push([`${label}#not-an-array`, entities, rows[0]]);
}

// The full-size page captures run as direct cases only: at 2394 rows each,
// the derived variants would multiply diff time for little extra coverage
// beyond what product-page-mid's variants already give.
derived.push([
  'kujo/product-page',
  entitySets.kujo,
  kujoRows.productPageRetail()
]);
derived.push([
  'kujo/product-page-wholesale',
  entitySets.kujo,
  kujoRows.productPageWholesale()
]);

// Composite primary keys, plus a mixed int/text key pairing.
{
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
  for (let tenantId = 1; tenantId <= 4; tenantId++) {
    for (let o = 0; o < 3; o++) {
      const orderId = 1000 + o;
      for (let c = 0; c < 3; c++) {
        rows.push({
          'comp_root#tenant_id': tenantId,
          'comp_root#order_id': orderId,
          'comp_root#label': `r-${tenantId}-${orderId}`,
          'comp_child#id': `${tenantId}-${orderId}-${c}`,
          'comp_child#root_key': `${tenantId}${orderId}`,
          'comp_child#value': `v-${c}`
        });
      }
    }
  }
  derived.push(['composite-pk', entities, rows]);
  derived.push(['composite-pk#shuffled', entities, shuffle([...rows], rng)]);
  derived.push([
    'composite-pk#null-parts',
    entities,
    rows.map((r, i) =>
      i % 3 === 0 ? { ...r, 'comp_root#order_id': null } : { ...r }
    )
  ]);
  /* Scope identity is defined by the "@"-joined string form of the root key
   * parts, so tuples whose joins collide are ONE scope: a part containing the
   * separator, or a number/string kind flip that lands on the same join. Any
   * raw-tuple index has to detect these and merge exactly like the string
   * form does.
   */
  derived.push([
    'composite-pk#separator-collision',
    entities,
    [
      {
        'comp_root#tenant_id': 'a@b',
        'comp_root#order_id': 'c',
        'comp_root#label': 'first',
        'comp_child#id': 1,
        'comp_child#root_key': 'a@bc',
        'comp_child#value': 'v1'
      },
      {
        'comp_root#tenant_id': 'a',
        'comp_root#order_id': 'b@c',
        'comp_root#label': 'second',
        'comp_child#id': 2,
        'comp_child#root_key': 'ab@c',
        'comp_child#value': 'v2'
      }
    ]
  ]);
  derived.push([
    'composite-pk#kind-flip-merge',
    entities,
    [
      {
        'comp_root#tenant_id': 5,
        'comp_root#order_id': 77,
        'comp_root#label': 'num',
        'comp_child#id': 1,
        'comp_child#root_key': '577',
        'comp_child#value': 'v1'
      },
      {
        'comp_root#tenant_id': '5',
        'comp_root#order_id': 77,
        'comp_root#label': 'str-dup',
        'comp_child#id': 2,
        'comp_child#root_key': '577',
        'comp_child#value': 'v2'
      },
      {
        'comp_root#tenant_id': 6,
        'comp_root#order_id': NaN,
        'comp_root#label': 'nan-part',
        'comp_child#id': 3,
        'comp_child#root_key': '6NaN',
        'comp_child#value': 'v3'
      }
    ]
  ]);
}

// Composite primary keys on a NON-root entity (a junction-table shape): the
// child's key string is a concatenation of several columns, and consecutive
// rows repeating the same child tuple - including across a root boundary,
// where the same tuple must yield a NEW model - pin the per-scope reuse
// exactly.
{
  class JunctionRoot {
    constructor(props) {
      this.id = props.id;
      this.name = props.name;
    }
  }
  class JunctionRoots {
    constructor({ models }) {
      this.models = models;
    }
  }
  class JunctionChild {
    constructor(props) {
      Object.assign(this, props);
    }
  }
  class JunctionChildren {
    constructor({ models }) {
      this.models = models;
    }
  }
  const entities = [
    {
      tableName: 'j_root',
      columns: ['id', 'name'],
      Model: JunctionRoot,
      Collection: JunctionRoots
    },
    {
      tableName: 'j_child',
      columns: [
        { column: 'left_id', primaryKey: true },
        { column: 'right_id', primaryKey: true },
        { column: 'root_id', references: JunctionRoot },
        'note'
      ],
      Model: JunctionChild,
      Collection: JunctionChildren
    }
  ];
  const row = (rootId, leftId, rightId, note) => ({
    'j_root#id': rootId,
    'j_root#name': `root-${rootId}`,
    'j_child#left_id': leftId,
    'j_child#right_id': rightId,
    'j_child#root_id': rootId,
    'j_child#note': note
  });
  const rows = [
    row(1, 10, 20, 'a'),
    row(1, 10, 20, 'a-dup'), // same tuple, same scope: one child model
    row(1, 10, 21, 'b'),
    row(2, 10, 21, 'c'), // same tuple as previous row, NEW scope: new model
    row(2, 10, 21, 'c-dup'),
    row(1, 10, 21, 'revisit'), // back to scope 1: its existing model
    row(2, null, null, 'no-key'), // keyless child row: no model at all
    row(2, 1020, null, 'concat-a'), // "1020" via one part...
    row(2, 10, 20, 'concat-b'), // ...collides with "10"+"20" - one model
    row(3, '10', 20, 'string-part') // key parts arriving as strings
  ];
  derived.push(['junction-composite-child', entities, rows]);
  derived.push([
    'junction-composite-child#shuffled',
    entities,
    shuffle([...rows], rng)
  ]);
  derived.push(['junction-composite-child#x2', entities, [...rows, ...rows]]);
}

// Null / undefined / falsy primary key values and self-referencing rows.
{
  class Node_ {
    constructor(props) {
      this.id = props.id;
      this.parentId = props.parentId;
      this.name = props.name;
    }
  }
  class Nodes {
    constructor({ models }) {
      this.models = models;
    }
  }
  const entities = [
    {
      tableName: 'node',
      columns: ['id', { column: 'parent_id', references: Node_ }, 'name'],
      Model: Node_,
      Collection: Nodes
    }
  ];
  derived.push([
    'self-ref',
    entities,
    [
      { 'node#id': 1, 'node#parent_id': null, 'node#name': 'a' },
      { 'node#id': 2, 'node#parent_id': 1, 'node#name': 'b' },
      { 'node#id': 3, 'node#parent_id': 1, 'node#name': 'c' }
    ]
  ]);
  derived.push([
    'falsy-ids',
    entities,
    [
      { 'node#id': 0, 'node#parent_id': null, 'node#name': 'zero' },
      { 'node#id': '', 'node#parent_id': 0, 'node#name': 'empty' },
      { 'node#id': false, 'node#parent_id': 0, 'node#name': 'false' },
      { 'node#id': null, 'node#parent_id': null, 'node#name': 'null' },
      { 'node#id': undefined, 'node#parent_id': 0, 'node#name': 'undef' }
    ]
  ]);
  derived.push([
    'mixed-type-ids',
    entities,
    [
      { 'node#id': 5, 'node#parent_id': null, 'node#name': 'num' },
      { 'node#id': '5', 'node#parent_id': 5, 'node#name': 'str-dup' },
      { 'node#id': 6, 'node#parent_id': '5', 'node#name': 'fk-str' }
    ]
  ]);
  derived.push([
    'bigint-ids',
    entities,
    [
      {
        'node#id': 9007199254740993n,
        'node#parent_id': null,
        'node#name': 'big'
      },
      {
        'node#id': 2,
        'node#parent_id': 9007199254740993n,
        'node#name': 'child'
      }
    ]
  ]);
  /* Key values whose raw identity and string identity disagree. Models are
   * defined as being indexed by their key's *string* form, so two distinct
   * Date objects for the same instant, or two NaNs, are one model - which is
   * the whole reason the raw-value index has to know when to stop trusting
   * itself.
   */
  const sameInstant = () => new Date(1700000000000);
  derived.push([
    'date-ids',
    entities,
    [
      { 'node#id': sameInstant(), 'node#parent_id': null, 'node#name': 'a' },
      { 'node#id': sameInstant(), 'node#parent_id': null, 'node#name': 'dup' },
      {
        'node#id': new Date(1800000000000),
        'node#parent_id': String(sameInstant()),
        'node#name': 'child'
      }
    ]
  ]);
  derived.push([
    'nan-ids',
    entities,
    [
      { 'node#id': NaN, 'node#parent_id': null, 'node#name': 'a' },
      { 'node#id': NaN, 'node#parent_id': null, 'node#name': 'dup' },
      { 'node#id': 2, 'node#parent_id': 'NaN', 'node#name': 'child' }
    ]
  ]);
  derived.push([
    'boolean-ids',
    entities,
    [
      { 'node#id': true, 'node#parent_id': null, 'node#name': 'yes' },
      { 'node#id': false, 'node#parent_id': 'true', 'node#name': 'no' }
    ]
  ]);
  // A root key column that only turns mixed part-way through the result set:
  // the scope index has to re-key itself without merging or splitting scopes.
  derived.push([
    'late-mixed-root-ids',
    entities,
    [
      { 'node#id': 1, 'node#parent_id': null, 'node#name': 'a' },
      { 'node#id': 2, 'node#parent_id': 1, 'node#name': 'b' },
      { 'node#id': '2', 'node#parent_id': 1, 'node#name': 'b-again' },
      { 'node#id': '3', 'node#parent_id': '2', 'node#name': 'c' },
      { 'node#id': 1, 'node#parent_id': null, 'node#name': 'a-again' }
    ]
  ]);
}

// Multiple references from one entity to the same target entity.
{
  class Person_ {
    constructor(props) {
      this.id = props.id;
      this.name = props.name;
    }
  }
  class People {
    constructor({ models }) {
      this.models = models;
    }
  }
  class Match_ {
    constructor(props) {
      this.id = props.id;
      this.homeId = props.homeId;
      this.awayId = props.awayId;
      this.refId = props.refId;
    }
  }
  class Matches {
    constructor({ models }) {
      this.models = models;
    }
  }
  const entities = [
    {
      tableName: 'match',
      columns: [
        'id',
        { column: 'home_id', references: Person_ },
        { column: 'away_id', references: Person_ },
        { column: 'ref_id', references: Person_ }
      ],
      Model: Match_,
      Collection: Matches
    },
    {
      tableName: 'person',
      columns: ['id', 'name'],
      Model: Person_,
      Collection: People
    }
  ];
  derived.push([
    'multi-ref-same-target',
    entities,
    [
      {
        'match#id': 1,
        'match#home_id': 7,
        'match#away_id': 7,
        'match#ref_id': 7,
        'person#id': 7,
        'person#name': 'same'
      },
      {
        'match#id': 2,
        'match#home_id': 7,
        'match#away_id': 8,
        'match#ref_id': 7,
        'person#id': 8,
        'person#name': 'other'
      }
    ]
  ]);
}

/* ------------------------------------------------------------------------ */

const methods = [
  'createFromDatabase',
  'createAnyFromDatabase',
  'createOneFromDatabase',
  'createOneOrNoneFromDatabase',
  'createManyFromDatabase'
];

const invoke = (core, method, entities, rows) => {
  try {
    const c = core.createCore({ entities });
    const value =
      method === 'createAnyFromDatabase'
        ? c[method](
            rows,
            (Array.isArray(rows) ? rows[0] : rows)
              ? Object.keys(Array.isArray(rows) ? rows[0] : rows)[0].split(
                  '#'
                )[0]
              : 'order'
          )
        : c[method](rows);
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: `${e.constructor.name}: ${e.message}` };
  }
};

let failures = 0;
let checks = 0;
for (const [label, entities, rows] of derived) {
  for (const method of methods) {
    checks++;
    const ra = invoke(A, method, entities, rows);
    const rb = invoke(B, method, entities, rows);
    if (ra.ok !== rb.ok) {
      failures++;
      console.log(
        `FAIL ${label} / ${method}: A ${ra.ok ? 'ok' : ra.error} vs B ${
          rb.ok ? 'ok' : rb.error
        }`
      );
      continue;
    }
    if (!ra.ok) {
      if (ra.error !== rb.error) {
        failures++;
        console.log(
          `FAIL ${label} / ${method}: error differs\n    A: ${ra.error}\n    B: ${rb.error}`
        );
      }
      continue;
    }
    const problems = compareGraphs(ra.value, rb.value, `${label}/${method}`);
    if (problems.length) {
      failures++;
      console.log(`FAIL ${label} / ${method}:`);
      for (const p of problems) {
        console.log('    ' + p);
      }
      continue;
    }
    const ja = safeStringify(ra.value);
    const jb = safeStringify(rb.value);
    if (ja !== jb) {
      failures++;
      console.log(
        `FAIL ${label} / ${method}: JSON differs\n    A: ${String(ja).slice(
          0,
          300
        )}\n    B: ${String(jb).slice(0, 300)}`
      );
    }
  }
}

console.log(
  `\n${checks - failures}/${checks} graph comparisons identical` +
    (failures ? ` - ${failures} FAILURES` : '')
);
process.exit(failures ? 1 : 0);
