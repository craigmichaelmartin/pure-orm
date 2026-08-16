/* eslint-disable no-console */
/* Differential test: runs every fixture and stress shape through two core
 * implementations and deep-compares the resulting object graphs - structure,
 * own-property order, property descriptors (enumerable/writable/configurable),
 * prototypes and cycle topology. Behaviour-preserving refactors of
 * createFromDatabase must produce byte-for-byte equivalent graphs, and unit
 * tests alone don't check descriptor attributes or property order.
 *
 *   node scripts/diff-core.js <coreA> <coreB>
 */
const path = require('path');

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

const A = requireCore(process.argv[2] || '.perf-ref/core-head.js');
const B = requireCore(process.argv[3] || './dist/src/core');

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
  fourteen: load('dist/test-utils/fourteen/entities').entities
};

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
  ['fourteen/fourteen', entitySets.fourteen, fixtures.fourteen]
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
