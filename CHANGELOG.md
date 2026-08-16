# Changelog

## Unreleased

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

Returned object graphs are unchanged: validated structurally identical to
v4.1.5 - property order, descriptor attributes, prototypes, cycle topology,
JSON serialization, and error behavior - across a differential suite of
fixtures and stress shapes, on both the compiled and interpreted paths.

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
