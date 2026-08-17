import camelCase from 'camelcase';

export interface IColumnData {
  column: string;
  property?: string;
  references?: IModelClass;
  primaryKey?: boolean;
}
export type IColumn = IColumnData | string;
export type IColumns = Array<IColumn> | (() => Array<IColumn>);

export interface IColumnInternalData {
  column: string;
  property: string;
  references?: IModelClass;
  primaryKey: boolean;
}
export type IColumnInternal = IColumnInternalData;
export type IColumnsInternal = Array<IColumnInternal>;

export interface IModel {
  [key: string]: any;
}
// IModel used as a type refers to an instance of IModel;
// IModelClass used as a type refers to the class itself
export type IModelClass = new (props: any) => IModel;
export interface ICollection<T extends IModel> {
  models: Array<T>;
}
export interface IEntity<T extends IModel> {
  tableName: string;
  displayName?: string;
  collectionDisplayName?: string;
  columns: IColumns;
  Model: new (props: any) => T;
  Collection: new ({ models }: any) => ICollection<T>;
}
export type IEntities<T extends IModel> = Array<IEntity<T>>;

export interface IEntityInternal<T extends IModel> {
  tableName: string;
  displayName: string;
  collectionDisplayName: string;
  columns: IColumnsInternal;
  propertyNames: Array<string>;
  Model: new (props: any) => T;
  Collection: new ({ models }: any) => ICollection<T>;
  columnNames: Array<string>;
  prefixedColumnNames: Array<string>;
  primaryKeys: Array<string>;
  references: object;
  selectColumnsClause: string;
  getPkId: (model: IModel) => string;
  columnToPropertyMap: Map<string, string>;
  propertyToColumnMap: Map<string, string>;
  referencesEntries: Array<{ property: string; ModelClass: IModelClass }>;
}
export type IEntitiesInternal<T extends IModel> = Array<IEntityInternal<T>>;

/* Positional result sets. `createFromDatabaseArrays` consumes rows as arrays
 * of cell values in field order - the shape a driver's array mode hands back
 * (node-postgres `rowMode: 'array'`) - so no per-row object is ever built.
 * `fields` names each cell position, as plain strings or driver field
 * descriptors carrying a `name`.
 *
 * `parseKinds` optionally moves the driver's per-cell type parsing into the
 * row processor itself, where it only runs for cells of a model actually
 * being created. A joined result set repeats parent cells on every child
 * row; parsing a cell whose model already exists is pure waste, and on wide
 * duplication-heavy joins that waste is most of the query's JS cost. Each
 * entry describes one field position: 0 leaves the cell untouched, 1 parses
 * a number, 2 a timestamp (`new Date`), 3 a postgres text-protocol boolean
 * (`'t'`), 4 JSON, and a function is called with the cell's text. SQL NULL
 * (and a missing cell) passes through unparsed. With `parseKinds` the rows
 * are expected to carry `string | null` cells, exactly as a postgres
 * text-protocol DataRow arrives.
 */
export type IParseKind = 0 | 1 | 2 | 3 | 4;
export type IArrayFieldParser = IParseKind | ((text: string) => any);
export interface INamedField {
  name: string;
}
export type IArrayField = string | INamedField;

export interface ICreateCoreOptions {
  entities: IEntities<IModel>;
}

export interface ICore {
  /* ------------------------------------------------------------------------*/
  /* Object Relational Mapping methods --------------------------------------*/
  /* ------------------------------------------------------------------------*/

  /* Note these construction methods ensure their count against the number of
   * generated top level business objects - independent of the number of
   * relational rows passed in as a result from a database driver query.
   * Thus, for example, `one` understands that there may be multiple result
   * rows (which a database driver's `one` query method would throw at) but
   * which correctly nest into one Model.)
   */

  createFromDatabase: <T extends ICollection<IModel>>(rows: any) => T;
  createFromDatabaseArrays: <T extends ICollection<IModel>>(
    rows: Array<Array<any>>,
    fields: Array<IArrayField>,
    parseKinds?: Array<IArrayFieldParser> | null
  ) => T;
  createAnyFromDatabase: <T extends ICollection<IModel>>(
    rows: any,
    rootKey: string | IModelClass
  ) => T;
  createOneFromDatabase: <T extends IModel>(rows: any) => T;
  createOneOrNoneFromDatabase: <T extends IModel>(rows: any) => T | void;
  createManyFromDatabase: <T extends ICollection<IModel>>(rows: any) => T;

  /* ------------------------------------------------------------------------*/
  /* Helpful Properties -----------------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  /* The tables property gives access to the sql select clause string for
   * each entity based on it's `displayName`. This property can be used when
   * writing raw SQL as the select clause, which handles quoting column names
   * and namespacing them to the table to avoid collisions and as required
   * for PureORM mapping.
   */
  tables: { [key: string]: { columns: string } };
  getEntityByModel: (model: IModel) => IEntityInternal<IModel>;
  getEntityByTableName: (tableName: string) => IEntityInternal<IModel>;
}

/* -------------------------------------------------------------------------*/
/* Row plan compilation ----------------------------------------------------*/
/* -------------------------------------------------------------------------*/

/* Turning rows into linked models is the hot path, and interpreting a list of
 * column/reference descriptors on every row is what makes it slow: every
 * column read, property store and reference hop goes through a dynamic
 * (megamorphic) keyed access.
 *
 * So a query shape is compiled once into a single specialized processor for
 * the whole result set - the row loop, root scope tracking, model lookup and
 * reference linking all in one function. All of the column names, property
 * names, entity slots and reference targets become literals, which turns
 * dynamic keyed access into monomorphic named access, gives every entity its
 * own `new Model(...)` call site, and lets the per-scope slot array stay in a
 * local across rows instead of being re-fetched through a helper call.
 *
 * The other half of the design is that key *strings* never get built. Models
 * and root scopes are defined as being indexed by a stringified key - that is
 * what makes an int4 primary key `5` match an int8 foreign key `'5'` - but
 * actually building those strings is the single most expensive thing a row can
 * do. It is not the `String()` call: it is that a freshly built string has no
 * cached hash, and handing one to a `Map` costs well over an order of
 * magnitude more than handing it the number it came from.
 *
 * So every index here is keyed by the raw column value, which is an exact
 * stand-in for the string key as long as the keys it is being compared against
 * are all numbers, or all strings: `String()` is injective over each of those
 * on its own. Everything else - an object key, a column that mixes types, NaN,
 * and a foreign key whose type differs from the primary key it names - is
 * detected at the point where it would matter, and settled by a string index
 * that is built on demand and then kept. A real result set, whose columns each
 * have one SQL type, never builds one; the semantics do not depend on that.
 *
 * On top of the index, each entity slot carries a one-entry cache of the last
 * raw value it resolved and the model it resolved to, so a run of rows sharing
 * a parent costs one compare per row. The cache follows the *most recently*
 * resolved value rather than the first one stored, because a joined result set
 * walks each parent's children in runs.
 *
 * `makeInterpretedRowsProcessor` is the semantically identical fallback used
 * where function construction is unavailable (a strict CSP, for example). It
 * indexes models under their string key directly, which a string-keyed slot
 * treats as its own exact raw key.
 */

interface IRowColumnPlan {
  rowKey: string;
  propertyName: string;
}
interface IRefPlan {
  property: string;
  targetIndex: number;
  targetDisplayName: string;
  /* False when this source's collection name collides with something on the
   * target class, which keeps that pair on the v4 own-property define. */
  useSymbolStore: boolean;
}
interface IEntityRowPlan {
  entity: IEntityInternal<IModel>;
  columnPlans: Array<IRowColumnPlan>;
  primaryKeyRowKeys: Array<string>;
  getPkId: (row: any) => string;
  buildModel: (row: any) => IModel;
  refs: Array<IRefPlan>;
  refCount: number;
  collectionDisplayName: string;
  collectionSymbol: symbol;
  Model: new (props: any) => IModel;
  Collection: new ({ models }: any) => ICollection<IModel>;
}

/* Per root scope, models are indexed by entity and primary key. A scope is one
 * flat array of six cells per entity:
 *
 *   [ mruRaw, mruModel, key0, model0, byRaw, byString ]
 *
 * `key0`/`model0` hold the entity's first model inline, so the `byRaw` Map is
 * only allocated for entities that actually accumulate more than one model in
 * a scope, and `mruRaw`/`mruModel` are the cache described above. `byString`
 * is the exact, string-keyed index and stays unbuilt unless something asks a
 * question the raw keys cannot answer. Keeping it all flat means a scope costs
 * one allocation and every probe is a constant-index load.
 */
type IRootScope = Array<any>;
const SLOT_WIDTH = 6;
interface IRowScratch {
  createdIndexes: Array<number>;
  createdModels: Array<IModel>;
  linkedTargets: Array<IModel>;
}
type IRowsProcessor = (rows: any, len: number, models: Array<IModel>) => void;

/* Marks "no raw value here". A private object is never `===` to anything a
 * database driver can hand back, so an unfilled slot can never be mistaken
 * for a row whose key column is `undefined`.
 */
const EMPTY_SLOT: any = {};

const CAN_COMPILE: boolean = ((): boolean => {
  try {
    // eslint-disable-next-line no-new-func
    return new Function('return 1;')() === 1;
  } catch (e) {
    return false;
  }
})();

/* Safety valve: an application that issues an unbounded number of distinct
 * query shapes should degrade to the interpreted path rather than paying for
 * endless function compilation.
 */
let compileBudget = 2048;
const canCompileNow = (): boolean => CAN_COMPILE && compileBudget > 0;

const literal = (value: string): string => JSON.stringify(value);

/* Array-mode compilation context. While a positional plan is being built,
 * `rowReadSource` swaps every generated row read from `row["table#column"]`
 * to `row[<index>]`, optionally wrapped in that field's inline parse
 * expression - which is what confines a driver's per-cell type parsing to
 * the cells that actually get kept. The context lives for exactly one
 * (synchronous) plan build; `t` is a scratch local every generated reader
 * scope declares. Custom parser functions land in `parserTable`, which the
 * generated processor receives as `PT`.
 */
interface IArrayModeContext {
  fieldIndex: Map<string, number>;
  kinds: Array<IArrayFieldParser> | null;
  parserTable: Array<(text: string) => any>;
}
let arrayMode: IArrayModeContext | null = null;
const EMPTY_PARSER_TABLE: Array<(text: string) => any> = [];

const rowReadSource = (rowKey: string): string => {
  if (arrayMode === null) {
    return 'row[' + literal(rowKey) + ']';
  }
  const index = arrayMode.fieldIndex.get(rowKey);
  if (index === void 0) {
    /* Column plans always come from the fields list, but primary-key row
     * keys are derived from the entity - a result set that omits an
     * entity's pk column reads `undefined` for it, exactly as object mode
     * reads a missing property.
     */
    return 'undefined';
  }
  const raw = 'row[' + index + ']';
  const kind = arrayMode.kinds === null ? 0 : arrayMode.kinds[index as number];
  if (kind === void 0 || kind === null || kind === 0) {
    return raw;
  }
  if (typeof kind === 'function') {
    let at = arrayMode.parserTable.indexOf(kind);
    if (at === -1) {
      at = arrayMode.parserTable.length;
      arrayMode.parserTable.push(kind);
    }
    return '((t=' + raw + ')==null?t:PT[' + at + '](t))';
  }
  if (kind === 1) {
    return '((t=' + raw + ')==null?t:+t)';
  }
  if (kind === 2) {
    return '((t=' + raw + ')==null?t:new Date(t))';
  }
  if (kind === 3) {
    return '((t=' + raw + ')==null?t:t==="t")';
  }
  if (kind === 4) {
    return '((t=' + raw + ')==null?t:JSON.parse(t))';
  }
  throw Error(`Unknown parse kind "${kind}"`);
};

const kindParserOf = (
  kind: IArrayFieldParser | void | null
): ((text: string) => any) | null => {
  if (kind === void 0 || kind === null || kind === 0) {
    return null;
  }
  if (typeof kind === 'function') {
    return kind;
  }
  if (kind === 1) {
    return Number;
  }
  if (kind === 2) {
    return (text: string): any => new Date(text);
  }
  if (kind === 3) {
    return (text: string): any => text === 't';
  }
  if (kind === 4) {
    return (text: string): any => JSON.parse(text);
  }
  throw Error(`Unknown parse kind "${kind}"`);
};

/* Generated functions are strict so that model property stores behave exactly
 * as they do in the (strict) compiled module - a frozen model still throws.
 */
const USE_STRICT = "'use strict';";

// Reused descriptor - `Object.defineProperty` copies out of it synchronously.
const COLLECTION_DESCRIPTOR: PropertyDescriptor = {
  value: void 0,
  writable: true,
  configurable: true,
  enumerable: false
};

const defineCollection = (
  target: IModel,
  collectionKey: string,
  collection: any
): void => {
  COLLECTION_DESCRIPTOR.value = collection;
  // Keep ORM back-reference collections out of default JSON serialization.
  Object.defineProperty(target, collectionKey, COLLECTION_DESCRIPTOR);
  COLLECTION_DESCRIPTOR.value = void 0;
};

/* Back-reference collection storage.
 *
 * A back-reference collection has to stay out of `Object.keys`, `for..in`,
 * spread and JSON - it is what makes a cyclic model graph JSON-serializable -
 * while still reading and writing as `model.lineItems`. Through v4 that meant
 * an own non-enumerable data property, and `Object.defineProperty` is the one
 * primitive that creates one: ~110ns per call on V8, by far the largest cost
 * in `createFromDatabase` (a 1.9x geomean against a plain store).
 *
 * v5 stores the collection as an own *symbol-keyed* data property instead - a
 * plain store - and exposes it under the collection display name through a
 * getter/setter pair installed once per (model prototype, collection name).
 * Symbol-keyed properties are invisible to `Object.keys`, `for..in`,
 * `JSON.stringify` and `Object.getOwnPropertyNames`, so everything the
 * non-enumerable property protected stays protected. What changes - the
 * breaking part - is own-property introspection under the collection name:
 * `hasOwnProperty` is false, `getOwnPropertyDescriptor` is undefined, `delete`
 * no longer clears the collection (assign `undefined` instead), and the name
 * answers `in` for every instance of a linked class. The symbols live in the
 * global symbol registry (`Symbol.for`) under a documented namespace, so the
 * storage itself is inspectable and two copies of pure-orm in one process
 * agree on it.
 *
 * A name collision falls back to the v4 own-property define, keeping v4
 * semantics exactly where the accessor could observably interfere: a column
 * property or forward-reference display name that equals the collection name
 * on the target class (the accessor's setter would swallow constructor and
 * link stores into the symbol slot), or any user-defined prototype member of
 * that name.
 */
const COLLECTION_SYMBOL_PREFIX = 'pure-orm:collection:';

export const collectionSymbolFor = (collectionDisplayName: string): symbol =>
  Symbol.for(COLLECTION_SYMBOL_PREFIX + collectionDisplayName);

interface ICollectionGetter {
  (): any;
  pureOrmCollectionAccessor?: boolean;
}

/* Returns true when the symbol store may be used for this (prototype, name)
 * pair: either the accessor was just installed, or an earlier core (or the
 * other copy of pure-orm in a duplicated dependency tree - the marker is a
 * plain property and the symbol comes from the global registry) already
 * installed it. Any unmarked property found anywhere on the chain belongs to
 * the user, and the pair stays on the v4 own-property define.
 */
const installCollectionAccessor = (
  proto: any,
  collectionKey: string,
  sym: symbol
): boolean => {
  let ancestor = proto;
  while (ancestor !== null && ancestor !== void 0) {
    const existing = Object.getOwnPropertyDescriptor(ancestor, collectionKey);
    if (existing !== void 0) {
      return (
        existing.get !== void 0 &&
        (existing.get as ICollectionGetter).pureOrmCollectionAccessor === true
      );
    }
    ancestor = Object.getPrototypeOf(ancestor);
  }
  const getter: ICollectionGetter = function (this: any): any {
    return this[sym];
  };
  getter.pureOrmCollectionAccessor = true;
  Object.defineProperty(proto, collectionKey, {
    get: getter,
    set: function (this: any, value: any): void {
      this[sym] = value;
    },
    enumerable: false,
    configurable: true
  });
  return true;
};

const makePkIdGetter = (rowKeys: Array<string>): ((row: any) => string) => {
  const count = rowKeys.length;
  if (canCompileNow()) {
    try {
      let body;
      if (count === 1) {
        body =
          'var v=row[' +
          literal(rowKeys[0]) +
          '];return v===undefined||v===null?"":typeof v==="string"?v:String(v);';
      } else {
        body = 'var s="";var v;';
        for (let i = 0; i < count; i++) {
          body +=
            'v=row[' +
            literal(rowKeys[i]) +
            '];if(v!==undefined&&v!==null){s+=typeof v==="string"?v:String(v);}';
        }
        body += 'return s;';
      }
      compileBudget--;
      // eslint-disable-next-line no-new-func
      return new Function('row', USE_STRICT + body) as (row: any) => string;
    } catch (e) {
      /* fall through to the interpreted implementation */
    }
  }
  return (row: any): string => {
    let id = '';
    for (let i = 0; i < count; i++) {
      const part = row[rowKeys[i]];
      if (part !== void 0 && part !== null) {
        id += String(part);
      }
    }
    return id;
  };
};

const makeRootScopeKeyGetter = (
  rowKeys: Array<string>
): ((row: any) => string) => {
  const count = rowKeys.length;
  if (canCompileNow()) {
    try {
      let body = 'var s="";var v;';
      for (let i = 0; i < count; i++) {
        if (i > 0) {
          body += 's+="@";';
        }
        body +=
          'v=row[' +
          literal(rowKeys[i]) +
          '];s+=v===undefined||v===null?"":typeof v==="string"?v:String(v);';
      }
      body += 'return s;';
      compileBudget--;
      // eslint-disable-next-line no-new-func
      return new Function('row', USE_STRICT + body) as (row: any) => string;
    } catch (e) {
      /* fall through to the interpreted implementation */
    }
  }
  return (row: any): string => {
    let rootScopeKey = '';
    for (let i = 0; i < count; i++) {
      if (i > 0) {
        rootScopeKey += '@';
      }
      const value = row[rowKeys[i]];
      rootScopeKey += value === void 0 || value === null ? '' : String(value);
    }
    return rootScopeKey;
  };
};

/* The interpreted analogs for positional rows: plain closures per cell, so
 * the array entry point still works where function construction is
 * unavailable, exactly like the interpreted object-row path.
 */
const makeArrayCellReader = (
  context: IArrayModeContext,
  rowKey: string
): ((row: Array<any>) => any) => {
  const index = context.fieldIndex.get(rowKey) as number;
  if (index === void 0) {
    // A pk column the result set omits: read undefined, like object mode.
    return (): any => void 0;
  }
  const parser = kindParserOf(
    context.kinds === null ? 0 : context.kinds[index]
  );
  if (parser === null) {
    return (row: Array<any>): any => row[index];
  }
  return (row: Array<any>): any => {
    const cell = row[index];
    return cell === void 0 || cell === null ? cell : parser(cell);
  };
};

const makeArrayPkIdGetter = (
  context: IArrayModeContext,
  rowKeys: Array<string>
): ((row: any) => string) => {
  const readers = rowKeys.map((rowKey) => makeArrayCellReader(context, rowKey));
  const count = readers.length;
  return (row: any): string => {
    let id = '';
    for (let i = 0; i < count; i++) {
      const part = readers[i](row);
      if (part !== void 0 && part !== null) {
        id += String(part);
      }
    }
    return id;
  };
};

const makeArrayRootScopeKeyGetter = (
  context: IArrayModeContext,
  rowKeys: Array<string>
): ((row: any) => string) => {
  const readers = rowKeys.map((rowKey) => makeArrayCellReader(context, rowKey));
  const count = readers.length;
  return (row: any): string => {
    let rootScopeKey = '';
    for (let i = 0; i < count; i++) {
      if (i > 0) {
        rootScopeKey += '@';
      }
      const value = readers[i](row);
      rootScopeKey += value === void 0 || value === null ? '' : String(value);
    }
    return rootScopeKey;
  };
};

const makeArrayModelBuilder = (
  context: IArrayModeContext,
  Model: new (props: any) => IModel,
  columnPlans: Array<IRowColumnPlan>
): ((row: any) => IModel) => {
  const count = columnPlans.length;
  const readers = columnPlans.map((columnPlan) =>
    makeArrayCellReader(context, columnPlan.rowKey)
  );
  return (row: any): IModel => {
    const props: any = {};
    for (let i = 0; i < count; i++) {
      props[columnPlans[i].propertyName] = readers[i](row);
    }
    return new Model(props);
  };
};

// `__proto__` in an object literal mutates the prototype instead of creating
// an own property, so those (vanishingly rare) shapes stay interpreted.
const isCompilableShape = (columnPlans: Array<IRowColumnPlan>): boolean => {
  for (let i = 0; i < columnPlans.length; i++) {
    if (columnPlans[i].propertyName === '__proto__') {
      return false;
    }
  }
  return true;
};

const propsLiteral = (columnPlans: Array<IRowColumnPlan>): string => {
  let source = '{';
  for (let i = 0; i < columnPlans.length; i++) {
    if (i > 0) {
      source += ',';
    }
    source +=
      literal(columnPlans[i].propertyName) +
      ':' +
      rowReadSource(columnPlans[i].rowKey);
  }
  return source + '}';
};

const makeModelBuilder = (
  Model: new (props: any) => IModel,
  columnPlans: Array<IRowColumnPlan>
): ((row: any) => IModel) => {
  const count = columnPlans.length;
  if (canCompileNow() && isCompilableShape(columnPlans)) {
    try {
      compileBudget--;
      // eslint-disable-next-line no-new-func
      return new Function(
        'M',
        USE_STRICT +
          'return function buildModel(row){return new M(' +
          propsLiteral(columnPlans) +
          ');};'
      )(Model) as (row: any) => IModel;
    } catch (e) {
      /* fall through to the interpreted implementation */
    }
  }
  return (row: any): IModel => {
    const props: any = {};
    for (let i = 0; i < count; i++) {
      const columnPlan = columnPlans[i];
      props[columnPlan.propertyName] = row[columnPlan.rowKey];
    }
    return new Model(props);
  };
};

/* Slot access. The inline-slot probes are emitted straight into generated
 * source (they are two array loads and a compare); only the rarer overflow-map
 * paths stay behind these calls, which keeps generated processors small enough
 * to reach the optimizing tier quickly.
 */
const makeSlotTemplate = (planCount: number): Array<any> => {
  const template = new Array(planCount * SLOT_WIDTH);
  for (let i = 0; i < planCount * SLOT_WIDTH; i++) {
    template[i] = i % SLOT_WIDTH === 0 ? EMPTY_SLOT : void 0;
  }
  return template;
};

const stringKeyOf = (value: any): string =>
  typeof value === 'string' ? value : String(value);

/* The string index is what the model index is *defined* in terms of, and it is
 * built the first time a raw key cannot answer a question exactly. Deriving it
 * from the raw entries costs one `String()` per model in the slot, once.
 */
const buildStringIndex = (
  scope: IRootScope,
  base: number
): Map<string, IModel> => {
  const byString = new Map<string, IModel>();
  byString.set(stringKeyOf(scope[base + 2]), scope[base + 3]);
  const byRaw: Map<any, IModel> | void = scope[base + 4];
  if (byRaw !== void 0) {
    byRaw.forEach((model: IModel, raw: any): void => {
      byString.set(stringKeyOf(raw), model);
    });
  }
  scope[base + 5] = byString;
  return byString;
};

const lookupByString = (
  scope: IRootScope,
  base: number,
  value: any
): IModel | void => {
  const byString: Map<string, IModel> =
    scope[base + 5] === void 0
      ? buildStringIndex(scope, base)
      : scope[base + 5];
  const model = byString.get(stringKeyOf(value));
  if (model !== void 0) {
    scope[base] = value;
    scope[base + 1] = model;
  }
  return model;
};

/* Model identity for a raw key the fast probes could not settle. Returns
 * `EMPTY_SLOT` - anything but `undefined`, so the caller creates nothing -
 * when the key stringifies to "", which is how "this row has no key for this
 * entity" has always read.
 */
const resolveAmbiguousModel = (
  scope: IRootScope,
  index: number,
  raw: any
): IModel | void => {
  const base = index * SLOT_WIDTH;
  const key = stringKeyOf(raw);
  if (key === '') {
    return EMPTY_SLOT;
  }
  const byString: Map<string, IModel> =
    scope[base + 5] === void 0
      ? buildStringIndex(scope, base)
      : scope[base + 5];
  const model = byString.get(key);
  if (model !== void 0) {
    scope[base] = raw;
    scope[base + 1] = model;
  }
  return model;
};

/* True when a raw `===` miss in this slot is not proof that the model is
 * absent, so the string index has to settle it. Raw keys stand in exactly for
 * their string keys while every key in the slot is a number, or every key is a
 * string, because `String()` is injective over each of those on its own. An
 * object key, a column that mixes types, or `NaN` all break that, and so does
 * a slot that has already been forced onto the string index.
 */
const rawKeyIsExact = (
  scope: IRootScope,
  base: number,
  value: any
): boolean => {
  if (scope[base + 5] !== void 0 || value !== value) {
    return false;
  }
  const kind = typeof value;
  return (
    (kind === 'number' || kind === 'string') && kind === typeof scope[base + 2]
  );
};

/* Model identity for a row: does this entity already have a model under this
 * key in this scope? A raw miss only reaches the string index when raw keys
 * cannot be trusted to be exact, which for a real result set is never.
 */
const resolveModel = (
  scope: IRootScope,
  index: number,
  raw: any
): IModel | void => {
  const base = index * SLOT_WIDTH;
  if (scope[base] === raw) {
    return scope[base + 1];
  }
  const key0 = scope[base + 2];
  if (key0 === void 0) {
    return void 0;
  }
  if (key0 === raw) {
    scope[base] = raw;
    scope[base + 1] = scope[base + 3];
    return scope[base + 3];
  }
  const byRaw: Map<any, IModel> | void = scope[base + 4];
  if (byRaw !== void 0) {
    const model = byRaw.get(raw);
    if (model !== void 0) {
      scope[base] = raw;
      scope[base + 1] = model;
      return model;
    }
  }
  return rawKeyIsExact(scope, base, raw)
    ? void 0
    : resolveAmbiguousModel(scope, index, raw);
};

/* Reference resolution from a foreign key value. Unlike model identity, a
 * foreign key is a *different column* from the primary key it names, so its
 * type genuinely can differ - an int4 primary key `5` has to match an int8
 * foreign key `'5'`. A raw miss therefore falls through to the string index,
 * which is what defines that match - but only when the types actually do
 * differ (or the slot has already been forced onto strings): a raw miss
 * between two numbers, or two strings, already proves the string forms
 * cannot match either, so a reference to a model that simply is not in the
 * result set stays off the string index entirely.
 */
const lookupModelByValue = (
  scope: IRootScope,
  index: number,
  value: any
): IModel | void => {
  const base = index * SLOT_WIDTH;
  if (scope[base] === value) {
    return scope[base + 1];
  }
  const key0 = scope[base + 2];
  if (key0 === void 0) {
    // The entity contributed no model to this scope; nothing can match.
    return void 0;
  }
  if (key0 === value) {
    scope[base] = value;
    scope[base + 1] = scope[base + 3];
    return scope[base + 3];
  }
  const byRaw: Map<any, IModel> | void = scope[base + 4];
  if (byRaw !== void 0) {
    const model = byRaw.get(value);
    if (model !== void 0) {
      scope[base] = value;
      scope[base + 1] = model;
      return model;
    }
  }
  return rawKeyIsExact(scope, base, value)
    ? void 0
    : lookupByString(scope, base, value);
};

/* Re-keys a raw-keyed scope map into a string-keyed one, for `Map.forEach`
 * with the replacement map as `thisArg`. Runs at most once per result set,
 * when a root key turns up that raw values cannot index exactly. Every key
 * still in the map is of one type at that point, so `String()` is injective
 * over them and no two scopes can collide.
 */
function restringifyScopeKey(
  this: Map<string, IRootScope>,
  scope: IRootScope,
  raw: any
): void {
  this.set(stringKeyOf(raw), scope);
}

/* The composite analog: re-keys the raw-tuple scope index into the
 * string-keyed map that *defines* composite scope identity, for the first
 * root tuple whose raw parts cannot stand in for their joined string form.
 * `entries` records every scope as its parts followed by the scope itself;
 * parts were normalized (null and undefined to `""`) when stored, so joining
 * their string forms rebuilds each scope key exactly as the string path
 * builds it. Runs at most once per result set.
 */
const migrateCompositeScopes = (
  entries: Array<any> | void,
  partCount: number
): Map<string, IRootScope> => {
  const byKey = new Map<string, IRootScope>();
  if (entries === void 0) {
    return byKey;
  }
  const width = partCount + 1;
  for (let i = 0; i < entries.length; i += width) {
    let scopeKey = '';
    for (let j = 0; j < partCount; j++) {
      if (j > 0) {
        scopeKey += '@';
      }
      const part = entries[i + j];
      scopeKey += typeof part === 'string' ? part : String(part);
    }
    byKey.set(scopeKey, entries[i + partCount]);
  }
  return byKey;
};

const storeModel = (
  scope: IRootScope,
  index: number,
  raw: any,
  model: IModel
): void => {
  const base = index * SLOT_WIDTH;
  scope[base] = raw;
  scope[base + 1] = model;
  if (scope[base + 2] === void 0) {
    scope[base + 2] = raw;
    scope[base + 3] = model;
  } else {
    let byRaw: Map<any, IModel> = scope[base + 4];
    if (byRaw === void 0) {
      byRaw = new Map<any, IModel>();
      scope[base + 4] = byRaw;
    }
    byRaw.set(raw, model);
  }
  const byString: Map<string, IModel> | void = scope[base + 5];
  if (byString !== void 0) {
    byString.set(stringKeyOf(raw), model);
  }
};

const makeCompiledRowsProcessor = (
  plans: Array<IEntityRowPlan>,
  planCount: number,
  rootScopeRowKeys: Array<string>
): IRowsProcessor | void => {
  if (!canCompileNow()) {
    return void 0;
  }
  for (let p = 0; p < planCount; p++) {
    if (!isCompilableShape(plans[p].columnPlans)) {
      return void 0;
    }
  }

  /* Phase 2 only concerns the entities this row *created*, which is the rare
   * case - a wide join spends most rows creating nothing at all. So instead of
   * clearing and then testing one local per entity on every row, every linking
   * entity gets a bit in `nw` and the whole phase is skipped on one compare.
   * (32 linking entities in a single query is already absurd; past that the
   * per-entity locals come back.)
   */
  const refBit: Array<number> = new Array(planCount);
  let refBearing = 0;
  for (let p = 0; p < planCount; p++) {
    refBit[p] = plans[p].refCount > 0 ? refBearing++ : -1;
  }
  const useMask = refBearing <= 32;

  /* Record a model in its entity's slot: raw-value cache, then the inline
   * entry (or the raw-keyed overflow Map beyond the first model), and finally
   * the string index if this slot has been forced to keep one.
   */
  const storeSource = (p: number, modelExpr: string): string => {
    const base = p * SLOT_WIDTH;
    return (
      'S[' +
      base +
      ']=v;S[' +
      (base + 1) +
      ']=' +
      modelExpr +
      ';if(S[' +
      (base + 2) +
      ']===undefined){S[' +
      (base + 2) +
      ']=v;S[' +
      (base + 3) +
      ']=' +
      modelExpr +
      ';}else{if((o=S[' +
      (base + 4) +
      '])===undefined){o=S[' +
      (base + 4) +
      ']=new Map();}o.set(v,' +
      modelExpr +
      ');}if((o=S[' +
      (base + 5) +
      '])!==undefined){o.set(typeof v==="string"?v:String(v),' +
      modelExpr +
      ');}'
    );
  };

  /* The generated form of `rawKeyIsExact`: true when a raw miss in this slot
   * really does mean "no such model", so nothing has to be stringified.
   */
  const rawIsExactSource = (
    base: number,
    value: string,
    key0: string
  ): string =>
    'S[' +
    (base + 5) +
    ']===undefined&&' +
    value +
    '===' +
    value +
    '&&typeof ' +
    value +
    '===typeof ' +
    key0 +
    '&&(typeof ' +
    value +
    '==="number"||typeof ' +
    value +
    '==="string")';

  /* Resolve `v` against an entity's slot, leaving the caller's `create` to run
   * where the model turns out not to exist yet. The raw cache is refreshed on
   * both hit paths; anything the raw probes cannot settle exactly goes to the
   * string index. Emitting the empty-slot test first, rather than folding it
   * into the last branch, measures faster on entities that fan out - it is one
   * compare against an immediate ahead of the two that can fail.
   */
  const probeSource = (base: number, exact: string, create: string): string =>
    'if((r=S[' +
    (base + 2) +
    '])===undefined){' +
    create +
    '}else if(r===v){S[' +
    base +
    ']=v;S[' +
    (base + 1) +
    ']=S[' +
    (base + 3) +
    '];}else if((o=S[' +
    (base + 4) +
    '])!==undefined&&(e=o.get(v))!==undefined){S[' +
    base +
    ']=v;S[' +
    (base + 1) +
    ']=e;}else if(' +
    exact +
    '||LA(S,' +
    base / SLOT_WIDTH +
    ',v)===undefined){';

  const linkSource = (p: number): string => {
    const plan = plans[p];
    const refCount = plan.refCount;
    const collectionKey = literal(plan.collectionDisplayName);
    let link = '';
    for (let r = 0; r < refCount; r++) {
      const ref = plan.refs[r];
      const targetBase = ref.targetIndex * SLOT_WIDTH;
      link += 'if((v=s[' + literal(ref.property) + '])!=null){';
      link +=
        't=S[' +
        targetBase +
        ']===v?S[' +
        (targetBase + 1) +
        ']:LR(S,' +
        ref.targetIndex +
        ',v);';
      link += 'if(t!==undefined){';
      link += 's[' + literal(ref.targetDisplayName) + ']=t;';
      /* A collection that does not exist yet is created holding the model that
       * caused it to exist. Building it empty and pushing would make V8 grow
       * the (zero-capacity) literal array to sixteen slots, which is most of
       * what a typical single-member back-reference collection costs.
       *
       * The store itself is a plain assignment to the plan's collection
       * symbol - the prototype accessor exposes it under the display name -
       * except where the name collided on this target at core creation, which
       * keeps the v4 own-property define.
       */
      link += ref.useSymbolStore
        ? 'if(!(col=t[Y' +
          p +
          '])){col=new C' +
          p +
          '({models:[s]});t[Y' +
          p +
          ']=col;}else '
        : 'if(!(col=t[' +
          collectionKey +
          '])){col=new C' +
          p +
          '({models:[s]});D.value=col;OD(t,' +
          collectionKey +
          ',D);}else ';
      if (r === 0) {
        link += 'col.models.push(s);';
      } else {
        // A model is only linked at creation time, so it can reach a given
        // collection twice only when it holds several references to the same
        // entity (and more than one of them resolves to the same target).
        let guard = 't!==l0';
        for (let l = 1; l < r; l++) {
          guard += '&&t!==l' + l;
        }
        link += 'if(' + guard + '){col.models.push(s);}';
      }
      if (r < refCount - 1) {
        link += 'l' + r + '=t;';
      }
      link += '}}';
    }
    return link;
  };

  let prologue = '';
  for (let p = 0; p < planCount; p++) {
    const plan = plans[p];
    prologue +=
      'var M' + p + '=P[' + p + '].Model,C' + p + '=P[' + p + '].Collection;';
    if (plan.refCount > 0) {
      prologue += 'var Y' + p + '=P[' + p + '].collectionSymbol;';
    }
    // K<p>: construct this entity's model for a row and index it in the scope.
    prologue +=
      'function K' +
      p +
      '(row,S,v){var o,t,m=new M' +
      p +
      '(' +
      propsLiteral(plan.columnPlans) +
      ');' +
      storeSource(p, 'm') +
      'return m;}';
    if (p === 0) {
      // R0: a root row with no primary key still yields a model, it just
      // cannot be de-duplicated or linked to, so it is never indexed.
      prologue +=
        'function R0(row){var t;return new M0(' +
        propsLiteral(plan.columnPlans) +
        ');}';
    }
    // L<p>: point a freshly created model at what it references.
    if (plan.refCount > 0) {
      let locals = 'var v,t,col;';
      for (let l = 0; l < plan.refCount - 1; l++) {
        locals += 'var l' + l + ';';
      }
      prologue += 'function L' + p + '(s,S,D){' + locals + linkSource(p) + '}';
    }
  }

  // `st` is kept apart from `e` so that scope states and models never share a
  // variable - mixing object shapes in one local costs more than it saves.
  /* The descriptor `Object.defineProperty` reads the collection out of is
   * built per call rather than shared at module scope. It stays in the young
   * generation, so storing a just-created collection into it needs no
   * generational write barrier, and it is unreachable the moment the call
   * returns - including when a user's constructor throws - so nothing has to
   * clear it afterwards to avoid pinning the last collection built.
   */
  let declarations =
    'var S,byKey,nb,row,sk,st,e,o,v,r,t,root,isNew,nw;' +
    'var D={value:undefined,writable:true,configurable:true,enumerable:false};' +
    'var curRaw=E,curKey="",rk=0,sm=0;';
  for (let p = 0; p < planCount; p++) {
    if (refBit[p] >= 0) {
      declarations += 'var m' + p + ';';
    }
  }

  /* Composite-keyed non-root entities memoize the raw parts of the last
   * primary key they resolved: while every part is `===`-unchanged the row
   * belongs to the model the entity just resolved, so nothing runs at all -
   * in particular the joined key string is not rebuilt. Equal raw parts
   * always join to the equal string, so the skip is exact without any type
   * guards; a change in any part rebuilds the string and takes the normal
   * probes. The memo only holds within one root scope, so the scope-change
   * branches reset the first part to the empty sentinel (which no row value
   * can ever be `===` to).
   */
  let compositeMemoResets = '';
  for (let p = 1; p < planCount; p++) {
    const partCount = plans[p].primaryKeyRowKeys.length;
    if (partCount > 1) {
      for (let i = 0; i < partCount; i++) {
        declarations += 'var w' + p + '_' + i + ',pw' + p + '_' + i + '=E;';
      }
      compositeMemoResets += 'pw' + p + '_0=E;';
    }
  }

  /* Root scope resolution. Rows for one root arrive together, so the common
   * case is "same raw key as the previous row" and never touches a string or
   * a Map; the string comparison behind it is what actually defines scope
   * identity, and the Map is only built once scopes interleave.
   */
  const rootIsSingleKey = rootScopeRowKeys.length === 1;
  let resolveScope = 'if(S===undefined||sk!==curKey){';
  resolveScope += 'st=undefined;';
  resolveScope += 'if(S!==undefined){';
  resolveScope += 'if(byKey===undefined){byKey=new Map();byKey.set(curKey,S);}';
  resolveScope += 'st=byKey.get(sk);}';
  resolveScope += 'if(st===undefined){st=NS();';
  resolveScope += 'if(byKey!==undefined){byKey.set(sk,st);}isNew=true;}';
  resolveScope += 'S=st;curKey=sk;}';

  /* The root model is a function of the root key alone, so it belongs inside
   * the "root key changed" branch with the scope it names: while a root's rows
   * keep arriving, both the scope and the root model are already in hand, and
   * the row costs nothing for the root entity at all. A root without a primary
   * key still yields a model; it just cannot be de-duplicated or linked to.
   */
  const rootCreate =
    refBit[0] < 0
      ? 'root=K0(row,S,v);'
      : (useMask ? 'nw=' + (1 << refBit[0]) + ';' : '') +
        'm0=K0(row,S,v);root=m0;';
  /* The root is resolved at most once per run of rows, so it goes through the
   * shared helper rather than inlining every probe: smaller generated source
   * reaches the optimizing tier sooner, and this is not the hot path.
   */
  const makeRootResolve = (emptyKeyTest: string): string =>
    'if(' +
    emptyKeyTest +
    '){root=R0(row);}' +
    'else if((e=LS(S,0,v))!==undefined){root=e;}' +
    'else{' +
    rootCreate +
    '}';

  /* A composite root gets the same memo treatment, one local per key column:
   * while every column is `===`-unchanged, the scope, the root model and the
   * root's primary key id are all already in hand and the row costs the part
   * loads and compares alone.
   *
   * When the tuple does change, scope identity is *defined* by the string the
   * parts join to ("@"-separated, null and undefined as ""), but the scopes
   * are indexed by the raw parts themselves in nested maps, so no key string
   * is built and - the expensive half - no freshly built string is retained
   * as a Map key. Raw tuples stand in exactly for their joined string while,
   * per column, every part is a non-NaN number or every part is an "@"-free
   * string: `String()` is injective over each kind on its own, and with the
   * separator in place equal joins then require equal tuples. The first part
   * that breaks that (a mixed column, an object, NaN, a string containing the
   * separator) migrates the index onto real string keys, once, and the shape
   * stays there - exactly the trade the single-key scope index makes.
   */
  let compositeRootScope = '';
  if (!rootIsSingleKey) {
    const partCount = rootScopeRowKeys.length;
    declarations += 'var cm=0,byKC,spL,u,pk0="";';
    for (let i = 0; i < partCount; i++) {
      declarations += 'var q' + i + ',n' + i + ',pr' + i + '=E,ck' + i + '=0;';
      compositeRootScope +=
        'q' + i + '=' + rowReadSource(rootScopeRowKeys[i]) + ';';
    }
    let changed = 'q0!==pr0';
    for (let i = 1; i < partCount; i++) {
      changed += '||q' + i + '!==pr' + i;
    }

    // Commit the memo and normalize the parts (null/undefined read as "",
    // which is what they contribute to the key string).
    let commit = 'isNew=false;' + compositeMemoResets;
    for (let i = 0; i < partCount; i++) {
      commit +=
        'pr' + i + '=q' + i + ';n' + i + '=q' + i + '==null?"":q' + i + ';';
    }

    /* Exactness guard, run once per distinct tuple: per column the parts must
     * stay one kind - non-NaN numbers (kind 1) or separator-free strings
     * (kind 2). Anything else flips the index to string keys for good.
     */
    let guards = '';
    for (let i = 0; i < partCount; i++) {
      const part = 'n' + i;
      const kind = 'ck' + i;
      guards +=
        'if(typeof ' +
        part +
        '==="number"){if(' +
        part +
        '!==' +
        part +
        '){cm=1;}else if(' +
        kind +
        '===0){' +
        kind +
        '=1;}else if(' +
        kind +
        '!==1){cm=1;}}else if(typeof ' +
        part +
        '==="string"){if(' +
        part +
        '.indexOf("@")>=0){cm=1;}else if(' +
        kind +
        '===0){' +
        kind +
        '=2;}else if(' +
        kind +
        '!==2){cm=1;}}else{cm=1;}';
    }
    guards +=
      'if(cm===1){byKey=MG(spL,' +
      partCount +
      ');byKC=undefined;spL=undefined;}';

    // Probe the nested raw index, creating the levels a new tuple needs.
    let rawLookup = 'st=undefined;if(byKC!==undefined){u=byKC.get(n0);';
    let rawLookupClose = '}';
    for (let i = 1; i < partCount - 1; i++) {
      rawLookup += 'if(u!==undefined){u=u.get(n' + i + ');';
      rawLookupClose += '}';
    }
    rawLookup +=
      'if(u!==undefined){st=u.get(n' + (partCount - 1) + ');}' + rawLookupClose;

    let rawCreate =
      'st=NS();if(byKC===undefined){byKC=new Map();spL=[];}u=byKC;';
    for (let i = 0; i < partCount - 1; i++) {
      rawCreate +=
        'if((o=u.get(n' +
        i +
        '))===undefined){o=new Map();u.set(n' +
        i +
        ',o);}u=o;';
    }
    rawCreate += 'u.set(n' + (partCount - 1) + ',st);spL.push(n0';
    for (let i = 1; i < partCount; i++) {
      rawCreate += ',n' + i;
    }
    rawCreate += ',st);isNew=true;';

    // The string path: scope identity as literally defined.
    let strResolve = 'sk="";';
    for (let i = 0; i < partCount; i++) {
      if (i > 0) {
        strResolve += 'sk+="@";';
      }
      strResolve +=
        'sk+=typeof n' + i + '==="string"?n' + i + ':String(n' + i + ');';
    }
    strResolve +=
      'st=byKey.get(sk);if(st===undefined){st=NS();byKey.set(sk,st);isNew=true;}';

    // The root's own key id keeps its historical form: the parts' string
    // forms concatenated with no separator, skipping null and undefined.
    let pkBuild = 'pk0="";';
    for (let i = 0; i < partCount; i++) {
      const part = 'q' + i;
      pkBuild +=
        'if(' +
        part +
        '==null){}else{pk0+=typeof ' +
        part +
        '==="string"?' +
        part +
        ':String(' +
        part +
        ');}';
    }

    compositeRootScope +=
      'if(' +
      changed +
      '){' +
      commit +
      'if(cm===0){' +
      guards +
      '}' +
      'if(cm===0){' +
      rawLookup +
      'if(st===undefined){' +
      rawCreate +
      '}S=st;}else{' +
      strResolve +
      'S=st;}' +
      pkBuild +
      'v=pk0;' +
      makeRootResolve('v===""') +
      'if(isNew){models.push(root);}}';
  }

  /* Scope identity is defined by the root key's *string* form, but building
   * that string is by far the most expensive thing a row can do: a freshly
   * created string has no cached hash, and handing one to a Map costs an order
   * of magnitude more than handing it the number it came from. So scopes are
   * keyed by the raw column value, which is an exact stand-in for the string
   * key while every root key is a number, or every one is a string. The first
   * root key that breaks that (a mixed column, an object, `NaN`) re-keys the
   * map to strings once and stays there.
   *
   * `sk === ""` reads as "this row has no root key" in either mode: a numeric
   * key is never the empty string, and a null column is given `""` directly.
   */
  const slowScopeKey =
    'if(sm===1){sk=v==null?"":typeof v==="string"?v:String(v);}' +
    'else if(v==null){sk="";}' +
    'else if(rk===0&&v===v&&(typeof v==="number"||typeof v==="string")){' +
    'rk=typeof v;sk=v;}' +
    'else{sm=1;' +
    'if(byKey!==undefined){nb=new Map();byKey.forEach(SK,nb);byKey=nb;nb=undefined;}' +
    'curKey=typeof curKey==="string"?curKey:String(curKey);' +
    'sk=typeof v==="string"?v:String(v);}';

  const scopeBlock = rootIsSingleKey
    ? 'v=' +
      rowReadSource(rootScopeRowKeys[0]) +
      ';if(v!==curRaw){isNew=false;curRaw=v;' +
      compositeMemoResets +
      'if(sm===0&&typeof v===rk&&v===v){sk=v;}else{' +
      slowScopeKey +
      '}' +
      resolveScope +
      makeRootResolve('sk===""') +
      'if(isNew){models.push(root);}}'
    : compositeRootScope;

  // Phase 1: materialize (or reuse) this row's non-root model instances.
  let body = '';
  for (let p = 1; p < planCount; p++) {
    const plan = plans[p];
    const base = p * SLOT_WIDTH;
    const singleKey = plan.primaryKeyRowKeys.length === 1;
    const bit = refBit[p];
    // Assigns the freshly created, freshly indexed model where phase 2 finds
    // it - entities nothing references never need to be held onto at all.
    const create =
      bit < 0
        ? 'K' + p + '(row,S,v);'
        : useMask
        ? 'nw|=' + (1 << bit) + ';m' + p + '=K' + p + '(row,S,v);'
        : 'm' + p + '=K' + p + '(row,S,v);';

    if (singleKey) {
      /* A raw `===` hit on the slot cache means this entity resolved this very
       * value a moment ago, so the row is already accounted for: no lookup,
       * nothing to link. That is the overwhelmingly common case in a joined
       * result set, and it costs one column read, one array load and one
       * compare. Every probe below it is raw too - the string key a model is
       * logically indexed by is only derived when `rawKeyIsExact` says the raw
       * one cannot stand in for it, which for a column of one SQL type never
       * happens. `v!==""` keeps an empty key meaning "no model", as an empty
       * string key always has.
       */
      body +=
        'if((v=' +
        rowReadSource(plan.primaryKeyRowKeys[0]) +
        ')!=null&&S[' +
        base +
        ']!==v&&v!==""){' +
        probeSource(base, rawIsExactSource(base, 'v', 'r'), create) +
        create +
        '}}';
    } else {
      /* The concatenated key is a string, so it is its own exact raw key. The
       * raw-parts memo in front of it (see its declaration site) means a run
       * of rows for one composite-keyed model never rebuilds the key at all.
       */
      let partLoads = '';
      let partsChanged = '';
      let partCommit = '';
      let buildKey = 'v="";';
      for (let i = 0; i < plan.primaryKeyRowKeys.length; i++) {
        const cur = 'w' + p + '_' + i;
        const prev = 'pw' + p + '_' + i;
        partLoads += cur + '=' + rowReadSource(plan.primaryKeyRowKeys[i]) + ';';
        partsChanged += (i === 0 ? '' : '||') + cur + '!==' + prev;
        partCommit += prev + '=' + cur + ';';
        buildKey +=
          'if(' +
          cur +
          '!=null){v+=typeof ' +
          cur +
          '==="string"?' +
          cur +
          ':String(' +
          cur +
          ');}';
      }
      body +=
        partLoads +
        'if(' +
        partsChanged +
        '){' +
        partCommit +
        buildKey +
        'if(v!==""&&S[' +
        base +
        ']!==v){' +
        probeSource(
          base,
          'S[' + (base + 5) + ']===undefined&&typeof r==="string"',
          create
        ) +
        create +
        '}}' +
        '}';
    }
  }

  // Phase 2: link newly created models to the models they reference.
  let phaseTwo = '';
  for (let p = 0; p < planCount; p++) {
    if (refBit[p] < 0) {
      continue;
    }
    phaseTwo += useMask
      ? 'if(nw&' + (1 << refBit[p]) + '){L' + p + '(m' + p + ',S,D);}'
      : 'if(m' + p + '!==undefined){L' + p + '(m' + p + ',S,D);}';
  }
  let rowPrefix = 'row=rows[i];';
  if (useMask) {
    if (phaseTwo !== '') {
      phaseTwo = 'if(nw!==0){' + phaseTwo + '}';
      rowPrefix += 'nw=0;';
    }
  } else {
    for (let p = 0; p < planCount; p++) {
      if (refBit[p] >= 0) {
        rowPrefix += 'm' + p + '=undefined;';
      }
    }
  }

  const slotTemplate = makeSlotTemplate(planCount);
  const newSlots = (): Array<any> => slotTemplate.slice();

  try {
    compileBudget--;
    // eslint-disable-next-line no-new-func
    return new Function(
      'P',
      'LR',
      'LS',
      'LA',
      'SK',
      'MG',
      'OD',
      'NS',
      'E',
      'PT',
      USE_STRICT +
        prologue +
        'return function processRows(rows,len,models){' +
        declarations +
        'for(var i=0;i<len;i++){' +
        rowPrefix +
        scopeBlock +
        body +
        phaseTwo +
        '}};'
    )(
      plans,
      lookupModelByValue,
      resolveModel,
      resolveAmbiguousModel,
      restringifyScopeKey,
      migrateCompositeScopes,
      Object.defineProperty,
      newSlots,
      EMPTY_SLOT,
      arrayMode === null ? EMPTY_PARSER_TABLE : arrayMode.parserTable
    ) as IRowsProcessor | void;
  } catch (e) {
    return void 0;
  }
};

const makeInterpretedRowsProcessor = (
  plans: Array<IEntityRowPlan>,
  planCount: number,
  rootScopeKeyIsRootPkId: boolean,
  getRootScopeKey: (row: any) => string
): IRowsProcessor => {
  const rootGetPkId = plans[0].getPkId;
  const slotTemplate = makeSlotTemplate(planCount);

  const processRow = (
    row: any,
    scope: IRootScope,
    rootScopeKey: string,
    scratch: IRowScratch
  ): IModel => {
    const { createdIndexes, createdModels, linkedTargets } = scratch;
    let rootModel: IModel | void = void 0;
    let createdCount = 0;

    for (let p = 0; p < planCount; p++) {
      const plan = plans[p];
      const pkId =
        p === 0
          ? rootScopeKeyIsRootPkId
            ? rootScopeKey
            : rootGetPkId(row)
          : plan.getPkId(row);
      if (pkId !== '') {
        // The interpreted path indexes models under their string key directly,
        // which a string-keyed slot treats as its own exact raw key.
        const existing = resolveModel(scope, p, pkId);
        if (existing !== void 0) {
          if (p === 0) {
            rootModel = existing;
          }
          continue;
        }
      } else if (p !== 0) {
        // No primary key means this is typically an outer-joined null row.
        // Skip model construction for non-root entities since it cannot link.
        continue;
      }

      const model = plan.buildModel(row);
      if (p === 0) {
        rootModel = model;
      }
      if (pkId !== '') {
        storeModel(scope, p, pkId, model);
        createdIndexes[createdCount] = p;
        createdModels[createdCount] = model;
        createdCount++;
      }
    }

    for (let c = 0; c < createdCount; c++) {
      const plan = plans[createdIndexes[c]];
      const refCount = plan.refCount;
      if (refCount === 0) {
        continue;
      }
      const refs = plan.refs;
      const sourceModel = createdModels[c];
      const collectionKey = plan.collectionDisplayName;
      let linkedCount = 0;

      for (let r = 0; r < refCount; r++) {
        const ref = refs[r];
        const refId = sourceModel[ref.property as keyof typeof sourceModel];
        if (refId === void 0 || refId === null) {
          continue;
        }
        const targetModel = lookupModelByValue(scope, ref.targetIndex, refId);
        if (targetModel === void 0) {
          continue;
        }

        sourceModel[ref.targetDisplayName as keyof typeof sourceModel] =
          targetModel;

        if (refCount > 1) {
          let alreadyLinked = false;
          for (let l = 0; l < linkedCount; l++) {
            if (linkedTargets[l] === targetModel) {
              alreadyLinked = true;
              break;
            }
          }
          if (alreadyLinked) {
            continue;
          }
          linkedTargets[linkedCount] = targetModel;
          linkedCount++;
        }

        if (ref.useSymbolStore) {
          const collection = targetModel[plan.collectionSymbol as any];
          if (collection) {
            collection.models.push(sourceModel);
          } else {
            // Like the compiled path, a collection that does not exist yet is
            // created already holding the model that caused it to exist, so
            // user Collection constructors see identical input on both paths.
            targetModel[plan.collectionSymbol as any] = new plan.Collection({
              models: [sourceModel]
            });
          }
        } else {
          const collection = targetModel[collectionKey];
          if (collection) {
            collection.models.push(sourceModel);
          } else {
            defineCollection(
              targetModel,
              collectionKey,
              new plan.Collection({ models: [sourceModel] })
            );
          }
        }
      }
    }

    return rootModel as IModel;
  };

  return (rows: any, len: number, models: Array<IModel>): void => {
    const scratch: IRowScratch = {
      createdIndexes: new Array(planCount),
      createdModels: new Array(planCount),
      linkedTargets: []
    };
    let rootScopeByKey: Map<string, IRootScope> | void = void 0;
    let currentRootScopeKey = '';
    let currentScope: IRootScope | void = void 0;

    for (let i = 0; i < len; i++) {
      const row = rows[i];
      const rootScopeKey = getRootScopeKey(row);

      let scope: IRootScope;
      let isNewScope = false;
      if (currentScope !== void 0 && rootScopeKey === currentRootScopeKey) {
        scope = currentScope;
      } else {
        let existingScope: IRootScope | void = void 0;
        if (currentScope !== void 0) {
          if (rootScopeByKey === void 0) {
            rootScopeByKey = new Map<string, IRootScope>();
            rootScopeByKey.set(currentRootScopeKey, currentScope);
          }
          existingScope = rootScopeByKey.get(rootScopeKey);
        }
        if (existingScope === void 0) {
          scope = slotTemplate.slice();
          if (rootScopeByKey !== void 0) {
            rootScopeByKey.set(rootScopeKey, scope);
          }
          isNewScope = true;
        } else {
          scope = existingScope;
        }
        currentRootScopeKey = rootScopeKey;
        currentScope = scope;
      }

      const rootModel = processRow(row, scope, rootScopeKey, scratch);
      if (isNewScope) {
        models.push(rootModel);
      }
    }
  };
};

export const createCore = ({
  entities: externalEntities
}: ICreateCoreOptions): ICore => {
  const entities: IEntitiesInternal<IModel> = externalEntities.map(
    (d: IEntity<IModel>) => {
      const tableName = d.tableName;
      const displayName = d.displayName || camelCase(d.tableName);
      const collectionDisplayName =
        d.collectionDisplayName || `${displayName}s`;
      const columns = (
        typeof d.columns === 'function' ? d.columns() : d.columns
      ).map((d: IColumn) => {
        if (typeof d === 'string') {
          return {
            column: d,
            property: camelCase(d),
            primaryKey: false
          };
        }
        return {
          column: d.column,
          property: d.property || camelCase(d.column),
          primaryKey: d.primaryKey || false,
          ...(d.references ? { references: d.references } : {})
        };
      });
      const propertyNames = columns.map(
        (x: IColumnInternal): string => x.property
      );
      const columnNames = columns.map((x: IColumnInternal): string => x.column);
      const prefixedColumnNames = columnNames.map(
        (col: string) => `${tableName}#${col}`
      );
      const Model = d.Model;
      const Collection = d.Collection;

      const pkColumnsData = columns.filter(
        (x: IColumnInternal) => x.primaryKey
      );
      const _primaryKeys = pkColumnsData.map((x: IColumnInternal) => x.column);
      const primaryKeys = _primaryKeys.length > 0 ? _primaryKeys : ['id'];

      const getPkId = (model: IModel): string => {
        let id = '';
        for (let i = 0; i < primaryKeys.length; i++) {
          const part = model[primaryKeys[i] as keyof typeof model];
          if (part !== void 0 && part !== null) {
            id += String(part);
          }
        }
        return id;
      };

      const references: any = {};
      const referencesEntries: Array<{
        property: string;
        ModelClass: IModelClass;
      }> = [];
      for (const col of columns) {
        if (col.references) {
          references[col.property] = col.references;
          referencesEntries.push({
            property: col.property,
            ModelClass: col.references
          });
        }
      }

      const columnToPropertyMap = new Map<string, string>();
      const propertyToColumnMap = new Map<string, string>();
      for (let i = 0; i < columnNames.length; i++) {
        columnToPropertyMap.set(columnNames[i], propertyNames[i]);
        propertyToColumnMap.set(propertyNames[i], columnNames[i]);
      }

      const selectColumnsClause = prefixedColumnNames
        .map(
          (prefixed: string, index: number) =>
            `"${tableName}".${columnNames[index]} as "${prefixed}"`
        )
        .join(', ');

      return {
        tableName,
        displayName,
        collectionDisplayName,
        columns,
        propertyNames,
        Model,
        Collection,
        columnNames,
        prefixedColumnNames,
        primaryKeys,
        references,
        selectColumnsClause,
        getPkId,
        columnToPropertyMap,
        propertyToColumnMap,
        referencesEntries
      };
    }
  );

  const tableNameToEntityMap = entities.reduce(
    (
      map: Map<string, IEntityInternal<IModel>>,
      entity: IEntityInternal<IModel>
    ) => {
      map.set(entity.tableName, entity);
      return map;
    },
    new Map()
  );

  const getEntityByTableName = (tableName: string): IEntityInternal<IModel> => {
    const entity = tableNameToEntityMap.get(tableName);
    if (!entity) {
      throw new Error(`Could not find entity for table ${tableName}`);
    }
    return entity;
  };

  const modelToEntityMap = entities.reduce(
    (
      map: Map<IModel, IEntityInternal<IModel>>,
      entity: IEntityInternal<IModel>
    ) => {
      map.set(entity.Model, entity);
      return map;
    },
    new Map()
  );

  const getEntityByModelClass = (
    Model: IModelClass
  ): IEntityInternal<IModel> => {
    const entity = modelToEntityMap.get(Model);
    if (!entity) {
      throw new Error(`Could not find entity for class ${Model}`);
    }
    return entity;
  };

  const getEntityByModel = (model: IModel): IEntityInternal<IModel> => {
    return getEntityByModelClass(model.constructor as IModelClass);
  };

  const entityReferencePlans = new Map<
    IEntityInternal<IModel>,
    Array<{
      property: string;
      targetEntity: IEntityInternal<IModel>;
      useSymbolStore: boolean;
    }>
  >();
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const plans = new Array<{
      property: string;
      targetEntity: IEntityInternal<IModel>;
      useSymbolStore: boolean;
    }>(entity.referencesEntries.length);
    for (let j = 0; j < entity.referencesEntries.length; j++) {
      const ref = entity.referencesEntries[j];
      plans[j] = {
        property: ref.property,
        targetEntity: getEntityByModelClass(ref.ModelClass),
        useSymbolStore: false
      };
    }
    entityReferencePlans.set(entity, plans);
  }

  /* Settle back-reference storage per (source collection name, target class)
   * and install the prototype accessors, once, ahead of any row processing.
   * The symbol store is only safe when nothing else writes the collection
   * name on the target: a column property or a forward-reference display name
   * of that name would hit the accessor's setter and vanish into the symbol
   * slot, so those pairs - and any user-defined prototype member - keep the
   * v4 own-property define instead.
   */
  entityReferencePlans.forEach((refPlans, sourceEntity) => {
    const collectionKey = sourceEntity.collectionDisplayName;
    const sym = collectionSymbolFor(collectionKey);
    for (let j = 0; j < refPlans.length; j++) {
      const target = refPlans[j].targetEntity;
      if (target.propertyNames.indexOf(collectionKey) !== -1) {
        continue;
      }
      const targetRefs = entityReferencePlans.get(target);
      let collides = false;
      if (targetRefs !== void 0) {
        for (let r = 0; r < targetRefs.length; r++) {
          if (targetRefs[r].targetEntity.displayName === collectionKey) {
            collides = true;
            break;
          }
        }
      }
      if (collides) {
        continue;
      }
      refPlans[j].useSymbolStore = installCollectionAccessor(
        target.Model.prototype,
        collectionKey,
        sym
      );
    }
  });

  interface IQueryPlan {
    keys: Array<string>;
    planCount: number;
    rootEntity: IEntityInternal<IModel>;
    RootCollection: new ({ models }: any) => ICollection<IModel>;
    processRows: IRowsProcessor;
  }

  const buildQueryPlan = (keys: Array<string>): IQueryPlan => {
    const plansByTable = new Map<string, IEntityRowPlan>();
    const plans: Array<IEntityRowPlan> = [];
    for (let k = 0; k < keys.length; k++) {
      const text = keys[k];
      const hashIndex = text.indexOf('#');
      if (hashIndex === -1) {
        throw new Error('Column names must be namespaced to table');
      }
      const tableName = text.substring(0, hashIndex);
      const column = text.substring(hashIndex + 1);

      let plan = plansByTable.get(tableName);
      if (!plan) {
        const entity = getEntityByTableName(tableName);
        plan = {
          entity,
          columnPlans: [],
          primaryKeyRowKeys: entity.primaryKeys.map(
            (pk: string) => `${tableName}#${pk}`
          ),
          getPkId: null as any,
          buildModel: null as any,
          refs: [],
          refCount: 0,
          collectionDisplayName: entity.collectionDisplayName,
          collectionSymbol: collectionSymbolFor(entity.collectionDisplayName),
          Model: entity.Model,
          Collection: entity.Collection
        };
        plansByTable.set(tableName, plan);
        plans.push(plan);
      }

      let propertyName = plan.entity.columnToPropertyMap.get(column);
      if (!propertyName) {
        if (column.startsWith('meta_')) {
          propertyName = camelCase(column);
        } else {
          throw Error(
            `No property name for "${column}" in business object "${plan.entity.displayName}". Non-spec'd columns must begin with "meta_".`
          );
        }
      }
      plan.columnPlans.push({
        rowKey: text,
        propertyName
      });
    }

    const planCount = plans.length;
    const entityToIndex = new Map<IEntityInternal<IModel>, number>();
    for (let i = 0; i < planCount; i++) {
      entityToIndex.set(plans[i].entity, i);
    }
    for (let i = 0; i < planCount; i++) {
      const plan = plans[i];
      const refs = entityReferencePlans.get(plan.entity);
      if (refs) {
        for (let r = 0; r < refs.length; r++) {
          const ref = refs[r];
          const targetIndex = entityToIndex.get(ref.targetEntity);
          if (targetIndex !== void 0) {
            plan.refs.push({
              property: ref.property,
              targetIndex,
              targetDisplayName: ref.targetEntity.displayName,
              useSymbolStore: ref.useSymbolStore
            });
          }
        }
      }
      plan.refCount = plan.refs.length;
    }

    const rootEntity = plans[0].entity;
    const rootPrimaryKeyRowKeys = plans[0].primaryKeyRowKeys;
    // With a single primary key the root scope key and the root model's
    // primary key id are the same string.
    const rootScopeKeyIsRootPkId = rootPrimaryKeyRowKeys.length === 1;

    let processRows = makeCompiledRowsProcessor(
      plans,
      planCount,
      rootPrimaryKeyRowKeys
    );
    if (processRows === void 0) {
      const context = arrayMode;
      for (let i = 0; i < planCount; i++) {
        const plan = plans[i];
        if (context === null) {
          plan.getPkId = makePkIdGetter(plan.primaryKeyRowKeys);
          plan.buildModel = makeModelBuilder(plan.Model, plan.columnPlans);
        } else {
          plan.getPkId = makeArrayPkIdGetter(context, plan.primaryKeyRowKeys);
          plan.buildModel = makeArrayModelBuilder(
            context,
            plan.Model,
            plan.columnPlans
          );
        }
      }
      let getRootScopeKey;
      if (rootScopeKeyIsRootPkId) {
        getRootScopeKey =
          context === null
            ? makePkIdGetter(rootPrimaryKeyRowKeys)
            : makeArrayPkIdGetter(context, rootPrimaryKeyRowKeys);
      } else {
        getRootScopeKey =
          context === null
            ? makeRootScopeKeyGetter(rootPrimaryKeyRowKeys)
            : makeArrayRootScopeKeyGetter(context, rootPrimaryKeyRowKeys);
      }
      processRows = makeInterpretedRowsProcessor(
        plans,
        planCount,
        rootScopeKeyIsRootPkId,
        getRootScopeKey
      );
    }

    return {
      keys,
      planCount,
      rootEntity,
      /* Every root model this plan produces is a `plans[0].Model`, so the
       * collection wrapping them is fixed by the plan - resolving it per call
       * from the first model would only re-derive the same answer.
       */
      RootCollection: getEntityByModelClass(plans[0].Model).Collection,
      processRows
    };
  };

  /* Query shapes repeat: the same SELECT runs over and over. Plans are keyed
   * off the (ordered) row key list, which V8 hands back as internalized
   * strings, so a cache hit is a pointer-comparison scan.
   */
  const MAX_QUERY_PLAN_CACHE = 64;
  const queryPlanCache: Array<IQueryPlan> = [];

  /* Shape identity for the two most-recently used plans, checked without
   * materializing `Object.keys`: for small result sets that array is a real
   * fraction of the whole call, and an application alternating between two
   * hot queries would otherwise pay for it on every single call. A hit on
   * the second entry deliberately does not promote it, so two shapes taking
   * turns settle one per slot and stop moving. `for..in` walks the same own
   * enumerable keys in the same order, then any inherited ones after them -
   * so anything unusual (a polluted prototype included) fails the comparison
   * and falls through to the exact `Object.keys` path below, which is also
   * where the answer comes from whenever this says no.
   */
  const rowKeysMatch = (candidateKeys: Array<string>, row: any): boolean => {
    const count = candidateKeys.length;
    let i = 0;
    for (const key in row) {
      if (i === count || candidateKeys[i] !== key) {
        return false;
      }
      i++;
    }
    return i === count;
  };

  const getQueryPlan = (sampleRow: any): IQueryPlan => {
    if (sampleRow !== void 0 && sampleRow !== null) {
      if (
        queryPlanCache.length !== 0 &&
        rowKeysMatch(queryPlanCache[0].keys, sampleRow)
      ) {
        return queryPlanCache[0];
      }
      if (
        queryPlanCache.length > 1 &&
        rowKeysMatch(queryPlanCache[1].keys, sampleRow)
      ) {
        return queryPlanCache[1];
      }
    }
    const keys: Array<string> =
      sampleRow === void 0 || sampleRow === null ? [] : Object.keys(sampleRow);
    const keyCount = keys.length;
    const firstKey = keys[0];
    for (let i = 0; i < queryPlanCache.length; i++) {
      const candidate = queryPlanCache[i];
      const candidateKeys = candidate.keys;
      // Column count then first column reject nearly every non-match before
      // the full comparison.
      if (candidateKeys.length !== keyCount || candidateKeys[0] !== firstKey) {
        continue;
      }
      let matched = true;
      for (let k = 1; k < keyCount; k++) {
        if (candidateKeys[k] !== keys[k]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        if (i > 0) {
          queryPlanCache.splice(i, 1);
          queryPlanCache.unshift(candidate);
        }
        return candidate;
      }
    }
    const queryPlan = buildQueryPlan(keys);
    queryPlanCache.unshift(queryPlan);
    if (queryPlanCache.length > MAX_QUERY_PLAN_CACHE) {
      queryPlanCache.pop();
    }
    return queryPlan;
  };

  /*
   * createFromDatabase architecture:
   * 1) Look up (or compile) the result-set processor for this query shape.
   * 2) Materialize models per row with scoped de-duplication by root scope key.
   * 3) Index models by root scope + entity + entity primary key.
   * 4) Link refs incrementally as new models appear.
   * 5) Return root models in first-seen root scope order.
   *
   * Steps 2-4 are one compiled function per query shape, so the per-row loop,
   * the scope tracking and the slot array all stay inside it.
   */
  const createFromDatabase = <T extends ICollection<IModel>>(rows: any): T => {
    const result = Array.isArray(rows) ? rows : [rows];
    const models: Array<IModel> = [];
    const queryPlan = getQueryPlan(result[0]);
    queryPlan.processRows(result, result.length, models);
    return <T>new queryPlan.RootCollection({ models });
  };

  /* Positional plans are cached twice over: by the identity of the `fields`
   * array (a caller that keeps one fields list per query site pays a WeakMap
   * probe and nothing else), and by content underneath, so a driver that
   * builds a fresh field-descriptor array per result still compiles each
   * (shape, parsing) pair exactly once. Distinct parse kinds over the same
   * fields are distinct plans - the parsing is compiled into the processor.
   */
  interface IArrayPlanEntry {
    keys: Array<string>;
    kinds: Array<IArrayFieldParser> | null;
    plan: IQueryPlan;
  }
  const arrayPlansByFields = new WeakMap<object, Array<IArrayPlanEntry>>();
  const arrayPlans: Array<IArrayPlanEntry> = [];

  const kindsMatch = (
    a: Array<IArrayFieldParser> | null,
    b: Array<IArrayFieldParser> | null
  ): boolean => {
    if (a === b) {
      return true;
    }
    if (a === null || b === null || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      const ka = a[i] === void 0 || a[i] === null ? 0 : a[i];
      const kb = b[i] === void 0 || b[i] === null ? 0 : b[i];
      if (ka !== kb) {
        return false;
      }
    }
    return true;
  };

  const getArrayQueryPlan = (
    fields: Array<IArrayField>,
    kinds: Array<IArrayFieldParser> | null
  ): IQueryPlan => {
    let byIdentity = arrayPlansByFields.get(fields);
    if (byIdentity !== void 0) {
      for (let i = 0; i < byIdentity.length; i++) {
        if (kindsMatch(byIdentity[i].kinds, kinds)) {
          return byIdentity[i].plan;
        }
      }
    }
    const keys = new Array<string>(fields.length);
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      keys[i] = typeof field === 'string' ? field : field.name;
    }
    let entry: IArrayPlanEntry | void = void 0;
    for (let i = 0; i < arrayPlans.length; i++) {
      const candidate = arrayPlans[i];
      const candidateKeys = candidate.keys;
      if (
        candidateKeys.length !== keys.length ||
        candidateKeys[0] !== keys[0] ||
        !kindsMatch(candidate.kinds, kinds)
      ) {
        continue;
      }
      let matched = true;
      for (let k = 1; k < keys.length; k++) {
        if (candidateKeys[k] !== keys[k]) {
          matched = false;
          break;
        }
      }
      if (matched) {
        entry = candidate;
        break;
      }
    }
    if (entry === void 0) {
      const fieldIndex = new Map<string, number>();
      for (let i = 0; i < keys.length; i++) {
        fieldIndex.set(keys[i], i);
      }
      arrayMode = {
        fieldIndex,
        // The caller may mutate its arrays later; the plan is compiled from
        // this moment's contents, so the cache must remember exactly these.
        kinds: kinds === null ? null : kinds.slice(),
        parserTable: []
      };
      let plan;
      try {
        plan = buildQueryPlan(keys);
      } finally {
        arrayMode = null;
      }
      entry = { keys, kinds: kinds === null ? null : kinds.slice(), plan };
      arrayPlans.unshift(entry);
      if (arrayPlans.length > MAX_QUERY_PLAN_CACHE) {
        arrayPlans.pop();
      }
    }
    if (byIdentity === void 0) {
      byIdentity = [];
      arrayPlansByFields.set(fields, byIdentity);
    }
    byIdentity.push(entry);
    return entry.plan;
  };

  const createFromDatabaseArrays = <T extends ICollection<IModel>>(
    rows: Array<Array<any>>,
    fields: Array<IArrayField>,
    parseKinds?: Array<IArrayFieldParser> | null
  ): T => {
    if (!Array.isArray(fields) || fields.length === 0) {
      throw Error('createFromDatabaseArrays requires a non-empty fields list');
    }
    if (!Array.isArray(rows)) {
      throw Error(
        'createFromDatabaseArrays requires rows as an array of arrays'
      );
    }
    const queryPlan = getArrayQueryPlan(
      fields,
      parseKinds === void 0 || parseKinds === null ? null : parseKinds
    );
    const models: Array<IModel> = [];
    queryPlan.processRows(rows, rows.length, models);
    return <T>new queryPlan.RootCollection({ models });
  };

  const createAnyFromDatabase = <T extends ICollection<IModel>>(
    rows: any,
    rootKey: string | IModelClass
  ): T => {
    if (!rows || !rows.length) {
      const Collection =
        typeof rootKey === 'string'
          ? getEntityByTableName(rootKey).Collection
          : getEntityByModelClass(rootKey).Collection;
      return new Collection({ models: [] }) as T;
    }
    return <T>createFromDatabase<T>(rows);
  };

  const createOneFromDatabase = <T extends IModel>(rows: any): T => {
    if (!rows || !rows.length) {
      throw Error('Did not get one.');
    }
    const collection = createFromDatabase<ICollection<IModel>>(rows);
    if (!collection || !collection.models || collection.models.length === 0) {
      throw Error('Did not get one.');
    } else if (collection.models.length > 1) {
      throw Error('Got more than one.');
    }
    return <T>collection.models[0];
  };

  const createOneOrNoneFromDatabase = <T extends IModel>(
    rows: any
  ): T | void => {
    if (!rows || !rows.length) {
      return void 0;
    }
    return <T>createOneFromDatabase(rows);
  };

  const createManyFromDatabase = <T extends ICollection<IModel>>(
    rows: any
  ): T => {
    if (!rows || !rows.length) {
      throw Error('Did not get at least one.');
    }
    return <T>createFromDatabase(rows);
  };

  return {
    getEntityByModel,
    getEntityByTableName,
    createFromDatabase,
    createFromDatabaseArrays,
    createAnyFromDatabase,
    createOneFromDatabase,
    createOneOrNoneFromDatabase,
    createManyFromDatabase,
    tables: entities.reduce((accum: any, data: IEntityInternal<IModel>) => {
      accum[data.displayName] = {
        columns: data.selectColumnsClause
      };
      return accum;
    }, {})
  };
};
