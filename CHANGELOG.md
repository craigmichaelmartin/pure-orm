# Changelog

## Unreleased (5.0.0)

### Breaking: back-reference collection storage

Back-reference collections (`order.lineItems` and the like) are no longer
own non-enumerable string-keyed properties. They are stored as own
**symbol-keyed** data properties - `Symbol.for('pure-orm:collection:' + collectionDisplayName)`, a documented, stable namespace - and exposed under
the collection display name by a getter/setter pair installed once per
(model prototype, collection name) at `createCore` time.

Why: `Object.defineProperty` is the only primitive that creates an own
non-enumerable data property, it costs ~110ns per call on V8 (~35x a plain
store), and one call per output collection made it the single largest cost
in `createFromDatabase`. The symbol store is a plain assignment. Measured
against the same build with v4 storage (A/B harness, min of 3 repeats per
scenario, Node 20.13): **1.74x geomean across the 19-scenario matrix**;
link-dense shapes gain the most (tiny-1row 4.7x, thirteen 3.8x, six 3.3x,
tiny-24row 3.2x, many-roots 2.9x, blog-three 2.5x, multi-core 2.2x); wide
captured production pages gain 1.35-1.4x; scenarios that link little or
are bound by user constructors sit at 1.0-1.1x (sparse-joins, sparse-many,
kujo-parcel-one, kujo-account-orders).

Everything the non-enumerable property existed to protect still holds:

- `JSON.stringify` output is **byte-for-byte identical** (cyclic graphs
  still serialize; symbol properties are invisible to JSON),
- `Object.keys`, `for..in`, `Object.getOwnPropertyNames`, and
  `Object.entries` still never show collection names,
- reading and assigning `model.lineItems` behaves as before (assignment goes
  through the prototype setter into the symbol slot).

What breaks - own-property introspection under the collection name:

- `model.hasOwnProperty('lineItems')` is now `false`; test for presence with
  `model.lineItems !== undefined`.
- `Object.getOwnPropertyDescriptor(model, 'lineItems')` is now `undefined`;
  the descriptor lives on the prototype as an accessor pair, and the data
  property lives under the collection symbol.
- `delete model.lineItems` no longer clears the collection (there is no own
  string-keyed property to delete); assign `model.lineItems = undefined`
  instead.
- `'lineItems' in model` is now `true` for every instance of a class that
  can be linked (the accessor is on the prototype), not just linked ones.
- Own **symbol** introspection now sees the storage:
  `Object.getOwnPropertySymbols(model)` includes the collection symbols, and
  because the symbol property is enumerable, `{ ...model }`,
  `Object.assign(target, model)`, and deep-equality assertions that include
  enumerable own symbols (`assert.deepStrictEqual`, jest's `toEqual`) now
  see collections they previously ignored. Spread-copies of models therefore
  retain a reference to the linked subgraph (invisibly to JSON and key
  enumeration).
- A model's ordering of collections _among_ its string-keyed properties no
  longer exists (symbol keys are ordered after all string keys); the order
  of the collection symbols themselves still follows link order.

The exported `collectionSymbolFor(collectionDisplayName)` returns the
storage symbol for a collection name, for deliberate introspection.

Name collisions keep the v4 own-property define, so the accessor can never
observably interfere: if the collection display name equals one of the
target class's column property names, a forward-reference display name
stored on that class, or any user-defined member anywhere on the target's
prototype chain, that (class, name) pair links exactly as v4 did.

Migration: audit for the five introspection patterns above under collection
display names. `for..in`-with-`hasOwnProperty`-guard copy loops are safe
unchanged (collections never appeared in `for..in` and still don't).

### Testing & benchmarks

Added `test-utils/kujo`: captured result sets and faithfully mirrored entity
definitions from pure-orm's heaviest production consumer (see that
directory's README for provenance and sanitization). New workloads the
hand-built fixtures never represented: a 2394-row × 68-column product-page
query over 11 entities whose ORDER BY systematically defeats
most-recently-used scope caching, a 174-column order-history page whose
joined product graph is entirely null, a 183-column 17-entity single-root
lookup, a 46-column entity driving the wide-table (>30 column) SQL-helper
path, models that build with `Object.assign` and derive data in their
constructors, a lazy circular `columns` function, and a duplicated column in
an entity definition.

Coverage added on top of them: `core.kujo.spec.ts` (page-graph structure,
per-scope identity, joined-but-null entities, dual references to one entity,
exactly-once construction), `orm.kujo.spec.ts` (wide-table and mask-boundary
helper shapes, previously untested), new `kujo/*` scenarios in `bench:core`
(plus a pages/sec product-render composite and wide-46 helper microbench),
`kujo-*` scenarios in the A/B harness, wide-46 cases in `bench-orm-ab`, and
kujo cases (with derived variants) in the differential graph suite -
guarded against drift by `test:bench-guard`.

### Performance

`createFromDatabase` now compiles a specialized row processor per query
shape: the row loop, root-scope tracking, model lookup, and reference
linking become one generated function in which column names, property
names, and reference targets are literals, and models and scopes are
indexed by raw column values instead of built key strings (with automatic,
exact migration to string keys whenever raw values cannot stand in for
them). Query plans are cached per core instance, and the two most recently
used shapes are matched without materializing `Object.keys`. Environments
that block function construction (strict CSP) use a semantically identical
interpreted fallback. The ORM SQL helpers (`getSqlInsertParts`,
`getSqlUpdateParts`, `getMatchingParts`, `getMatchingPartsObject`) memoize
their clause strings per model shape, keyed by which properties are set.

Returned object graphs are unchanged up to the documented storage change:
validated against v4.1.5 across a differential suite of fixtures and stress
shapes (950 graph comparisons), on both the compiled and interpreted paths -
values, own-property order, prototypes, cycle topology, error behavior, and
byte-for-byte JSON serialization, with back-reference collections compared
by name across the two storage forms (`scripts/diff-core.js --logical`).
The compiled and interpreted paths of this release are additionally
byte-for-byte identical to each other, descriptors and symbols included.

Wide tables (past the 30-column bit-mask limit) now compile their SQL-helper
shape scan too: per model class, the collector becomes the same
straight-line named-read sequence the masked collectors get, accumulating
the packed string shape key inline instead of running a shared interpreted
loop whose per-column keyed reads are megamorphic across model classes.
`getSqlInsertParts`, `getSqlUpdateParts`, and `getMatchingParts` on a
46-column entity measure 4.5-5.2x faster; helper outputs are byte-identical
(`diff-orm`, 4397 comparisons) including property-read order and counts.

### Behavior notes

- Collection constructors now receive their first member at construction: a
  back-reference collection is created as
  `new Collection({ models: [firstMember] })`, where v4.1.5 constructed with
  an empty array and pushed. Subsequent members are still added with
  `collection.models.push(member)`. This is invisible to the documented
  `this.models = models` contract; only a Collection constructor that
  inspects or copies its `models` argument can observe it.
- Constructor invocation counts for input rows that produce no new output
  are not part of the API contract. For example, v4.1.5 constructed and
  discarded a root model for every row whose root primary key was null; the
  compiled path constructs one per run of equal root keys. Returned graphs
  are identical.
- The returned collection class is resolved from the query's root entity
  rather than from `models[0].constructor`. This differs only for Model
  constructors that return a foreign object, where v4.1.5 threw
  `Could not find entity for class ...`.

## 4.1.5 and earlier

Releases before this changelog are described by their git history.
