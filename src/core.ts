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
 * The other half of the design is that primary key *strings* are lazy. Models
 * are indexed by a stringified key (so that an int4 primary key `5` still
 * matches an int8 foreign key `'5'`), but stringifying every key column of
 * every row is pure overhead when the answer is "same model as the last row".
 * So each slot remembers the raw column value it was stored under alongside
 * its string key: a raw `===` hit skips stringification entirely, and anything
 * else falls back to the exact string-keyed lookup, which keeps the coercion
 * behaviour identical.
 *
 * `makeInterpretedRowsProcessor` is the semantically identical (string-only)
 * fallback used where function construction is unavailable (a strict CSP, for
 * example).
 */

interface IRowColumnPlan {
  rowKey: string;
  propertyName: string;
}
interface IRefPlan {
  property: string;
  targetIndex: number;
  targetDisplayName: string;
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
  Model: new (props: any) => IModel;
  Collection: new ({ models }: any) => ICollection<IModel>;
}

/* Per root scope, models are indexed by entity and primary key id. A scope is
 * just one flat array of [rawKey, pkId, model, overflow] per entity: most
 * scopes hold a single model per entity, so the first one lives in the slot
 * itself and the overflow Map is only allocated for entities that actually
 * accumulate more than one model. Keeping it flat means a scope costs one
 * allocation, and every probe is a constant-index load.
 */
type IRootScope = Array<any>;
const SLOT_WIDTH = 4;
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
      ':row[' +
      literal(columnPlans[i].rowKey) +
      ']';
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

const lookupModel = (
  scope: IRootScope,
  index: number,
  key: string
): IModel | void => {
  const base = index * SLOT_WIDTH;
  if (scope[base + 1] === key) {
    return scope[base + 2];
  }
  const overflow = scope[base + 3];
  return overflow === void 0 ? void 0 : overflow.get(key);
};

/* Reference resolution from a raw foreign key value. The raw `===` probe is
 * done by the caller; this is the string-keyed fallback that preserves the
 * pk/fk coercion match. Deliberately not written in terms of `lookupModel`:
 * this is the hot miss path for any entity holding several models in a scope,
 * and it should cost one call, not two.
 */
const lookupModelByValue = (
  scope: IRootScope,
  index: number,
  value: any
): IModel | void => {
  const key = typeof value === 'string' ? value : String(value);
  const base = index * SLOT_WIDTH;
  if (scope[base + 1] === key) {
    return scope[base + 2];
  }
  const overflow = scope[base + 3];
  return overflow === void 0 ? void 0 : overflow.get(key);
};

const storeModel = (
  scope: IRootScope,
  index: number,
  key: string,
  raw: any,
  model: IModel
): void => {
  const base = index * SLOT_WIDTH;
  if (scope[base + 1] === void 0) {
    scope[base] = raw;
    scope[base + 1] = key;
    scope[base + 2] = model;
    return;
  }
  let overflow = scope[base + 3];
  if (overflow === void 0) {
    overflow = new Map<string, IModel>();
    scope[base + 3] = overflow;
  }
  overflow.set(key, model);
};

const pkIdSource = (rowKeys: Array<string>, target: string): string => {
  if (rowKeys.length === 1) {
    return (
      target +
      '=(v=row[' +
      literal(rowKeys[0]) +
      '])==null?"":typeof v==="string"?v:String(v);'
    );
  }
  let source = target + '="";';
  for (let i = 0; i < rowKeys.length; i++) {
    source +=
      'if((v=row[' +
      literal(rowKeys[i]) +
      '])!=null){' +
      target +
      '+=typeof v==="string"?v:String(v);}';
  }
  return source;
};

/* Only primitives are remembered as raw slot keys. An object key would make
 * the raw hit skip a `String()` call that is not guaranteed to return the same
 * text twice, so those always take the string path.
 */
const rawOfSource = (value: string): string =>
  'typeof ' + value + '==="object"?E:' + value;

const makeCompiledRowsProcessor = (
  plans: Array<IEntityRowPlan>,
  planCount: number,
  rootScopeRowKeys: Array<string>
): IRowsProcessor | void => {
  if (!canCompileNow()) {
    return void 0;
  }
  let maxRefCount = 0;
  for (let p = 0; p < planCount; p++) {
    if (!isCompilableShape(plans[p].columnPlans)) {
      return void 0;
    }
    if (plans[p].refCount > maxRefCount) {
      maxRefCount = plans[p].refCount;
    }
  }

  /* Source for the two cold operations, shared by the inline and outlined
   * forms so the only difference between them is where the code lands.
   */
  const storeSource = (p: number, modelExpr: string): string => {
    const base = p * SLOT_WIDTH;
    return (
      'if(S[' +
      (base + 1) +
      ']===undefined){S[' +
      base +
      ']=' +
      rawOfSource('v') +
      ';S[' +
      (base + 1) +
      ']=k;S[' +
      (base + 2) +
      ']=' +
      modelExpr +
      ';}else{if((o=S[' +
      (base + 3) +
      '])===undefined){o=S[' +
      (base + 3) +
      ']=new Map();}o.set(k,' +
      modelExpr +
      ');}'
    );
  };

  const linkSource = (p: number): string => {
    const plan = plans[p];
    const refCount = plan.refCount;
    const collectionKey = literal(plan.collectionDisplayName);
    let link = '';
    for (let l = 0; l < refCount - 1; l++) {
      link += 'l' + l + '=undefined;';
    }
    for (let r = 0; r < refCount; r++) {
      const ref = plan.refs[r];
      const targetBase = ref.targetIndex * SLOT_WIDTH;
      link += 'if((v=s[' + literal(ref.property) + '])!=null){';
      link +=
        't=S[' +
        targetBase +
        ']===v?S[' +
        (targetBase + 2) +
        ']:LR(S,' +
        ref.targetIndex +
        ',v);';
      link += 'if(t!==undefined){';
      link += 's[' + literal(ref.targetDisplayName) + ']=t;';
      link += 'if(!(col=t[' + collectionKey + '])){';
      link +=
        'col=new C' + p + '({models:[]});DC(t,' + collectionKey + ',col);}';
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
    // K<p>: construct this entity's model for a row and index it in the scope.
    prologue +=
      'function K' +
      p +
      '(row,S,k,v){var o,m=new M' +
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
        'function R0(row){return new M0(' +
        propsLiteral(plan.columnPlans) +
        ');}';
    }
    // L<p>: point a freshly created model at what it references.
    if (plan.refCount > 0) {
      let locals = 'var v,t,col;';
      for (let l = 0; l < plan.refCount - 1; l++) {
        locals += 'var l' + l + ';';
      }
      prologue += 'function L' + p + '(s,S){' + locals + linkSource(p) + '}';
    }
  }

  // `st` is kept apart from `e` so that scope states and models never share a
  // variable - mixing object shapes in one local costs more than it saves.
  let declarations =
    'var S,byKey,row,sk,st,e,o,v,k,root,isNew;var curRaw=E,curKey="";';
  for (let p = 0; p < planCount; p++) {
    declarations += 'var m' + p + ';';
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

  /* A composite root key gets the same treatment, one memo local per key
   * column: while every column is unchanged the scope key string, and with it
   * the root's own primary key id, are unchanged too.
   */
  let compositeRootScope = '';
  if (!rootIsSingleKey) {
    for (let i = 0; i < rootScopeRowKeys.length; i++) {
      declarations += 'var q' + i + ',pr' + i + '=E;';
      compositeRootScope +=
        'q' + i + '=row[' + literal(rootScopeRowKeys[i]) + '];';
    }
    let changed = 'q0!==pr0';
    for (let i = 1; i < rootScopeRowKeys.length; i++) {
      changed += '||q' + i + '!==pr' + i;
    }
    let rebuild = 'sk="";pk0="";';
    for (let i = 0; i < rootScopeRowKeys.length; i++) {
      const part = 'q' + i;
      if (i > 0) {
        rebuild += 'sk+="@";';
      }
      rebuild +=
        'if(' +
        part +
        '==null){}else{sk+=typeof ' +
        part +
        '==="string"?' +
        part +
        ':String(' +
        part +
        ');pk0+=typeof ' +
        part +
        '==="string"?' +
        part +
        ':String(' +
        part +
        ');}';
      rebuild += 'pr' + i + '=typeof ' + part + '==="object"?E:' + part + ';';
    }
    compositeRootScope += 'if(' + changed + '){' + rebuild + resolveScope + '}';
    declarations += 'var pk0="";';
  }

  const scopeBlock = rootIsSingleKey
    ? 'if((v=row[' +
      literal(rootScopeRowKeys[0]) +
      '])!==curRaw){' +
      'sk=v==null?"":typeof v==="string"?v:String(v);' +
      resolveScope +
      'curRaw=' +
      rawOfSource('v') +
      ';}'
    : compositeRootScope;

  // Phase 1: materialize (or reuse) this row's model instances. A model local
  // is left undefined unless this row is the one that created it, which is
  // also what phase 2 keys off.
  let body = '';
  for (let p = 0; p < planCount; p++) {
    const plan = plans[p];
    const modelVar = 'm' + p;
    const base = p * SLOT_WIDTH;
    const singleKey = plan.primaryKeyRowKeys.length === 1;
    /* A raw `===` hit on the inline slot means this entity's model is already
     * the one an earlier row put there - no key string, no lookup call. The
     * null test comes first so that an outer join that matched nothing costs
     * one column read and nothing else.
     */
    const readKeyColumn = '(v=row[' + literal(plan.primaryKeyRowKeys[0]) + '])';
    // True when the inline slot already holds this row's model.
    const rawHit = readKeyColumn + '!=null&&S[' + base + ']===v';
    // True when the string-keyed path has to run.
    const rawMiss = readKeyColumn + '!=null&&S[' + base + ']!==v';
    const buildKey = singleKey
      ? 'k=(v=row[' +
        literal(plan.primaryKeyRowKeys[0]) +
        '])==null?"":typeof v==="string"?v:String(v);'
      : pkIdSource(plan.primaryKeyRowKeys, 'k') + 'v=E;';
    // After the raw probe the key column is known non-null and read into `v`.
    const buildKeyFromV = singleKey
      ? 'k=typeof v==="string"?v:String(v);'
      : buildKey;
    const useRawProbe = singleKey;
    // Assigns `target` the freshly created, freshly indexed model.
    const createInto = (target: string): string =>
      target + '=K' + p + '(row,S,k,v);';

    body += modelVar + '=undefined;';
    if (p === 0) {
      /* With a single key column the root scope key and the root's primary key
       * id are the same string, and `sk` always holds the current scope's key
       * (it is only rewritten when the scope changes), so the root never needs
       * a second `String()`.
       *
       * A root without a primary key still yields a model; it just cannot be
       * de-duplicated or linked to.
       */
      let rootLookup = 'if(k===""){root=R0(row);}';
      rootLookup += 'else if(S[1]===k){root=S[2];}';
      rootLookup +=
        'else if((o=S[3])!==undefined&&(e=o.get(k))!==undefined){root=e;}';
      rootLookup += 'else{' + createInto('m0') + 'root=m0;}';
      body += useRawProbe
        ? 'if(' + rawHit + '){root=S[2];}else{k=sk;' + rootLookup + '}'
        : 'k=pk0;v=E;' + rootLookup;
    } else {
      let lookup = 'if(k!==""&&S[' + (base + 1) + ']!==k';
      lookup +=
        '&&((o=S[' + (base + 3) + '])===undefined||o.get(k)===undefined)){';
      lookup += createInto(modelVar) + '}';
      body += useRawProbe
        ? 'if(' + rawMiss + '){' + buildKeyFromV + lookup + '}'
        : buildKey + lookup;
    }
  }

  // Phase 2: link newly created models to the models they reference.
  for (let p = 0; p < planCount; p++) {
    if (plans[p].refCount === 0) {
      continue;
    }
    body += 'if(m' + p + '!==undefined){';
    body += 'L' + p + '(m' + p + ',S);';
    body += '}';
  }

  const slotTemplate = makeSlotTemplate(planCount);
  const newSlots = (): Array<any> => slotTemplate.slice();

  try {
    compileBudget--;
    // eslint-disable-next-line no-new-func
    return new Function(
      'P',
      'LR',
      'DC',
      'NS',
      'E',
      USE_STRICT +
        prologue +
        'return function processRows(rows,len,models){' +
        declarations +
        'for(var i=0;i<len;i++){row=rows[i];isNew=false;' +
        scopeBlock +
        body +
        'if(isNew){models.push(root);}}};'
    )(
      plans,
      lookupModelByValue,
      defineCollection,
      newSlots,
      EMPTY_SLOT
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
        const existing = lookupModel(scope, p, pkId);
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
        const raw =
          plan.primaryKeyRowKeys.length === 1
            ? row[plan.primaryKeyRowKeys[0]]
            : EMPTY_SLOT;
        storeModel(
          scope,
          p,
          pkId,
          typeof raw === 'object' ? EMPTY_SLOT : raw,
          model
        );
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

        let collection = targetModel[collectionKey];
        if (!collection) {
          collection = new plan.Collection({ models: [] });
          defineCollection(targetModel, collectionKey, collection);
        }

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
        collection.models.push(sourceModel);
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
    Array<{ property: string; targetEntity: IEntityInternal<IModel> }>
  >();
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const plans = new Array<{
      property: string;
      targetEntity: IEntityInternal<IModel>;
    }>(entity.referencesEntries.length);
    for (let j = 0; j < entity.referencesEntries.length; j++) {
      const ref = entity.referencesEntries[j];
      plans[j] = {
        property: ref.property,
        targetEntity: getEntityByModelClass(ref.ModelClass)
      };
    }
    entityReferencePlans.set(entity, plans);
  }

  interface IQueryPlan {
    keys: Array<string>;
    planCount: number;
    rootEntity: IEntityInternal<IModel>;
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
              targetDisplayName: ref.targetEntity.displayName
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
      for (let i = 0; i < planCount; i++) {
        const plan = plans[i];
        plan.getPkId = makePkIdGetter(plan.primaryKeyRowKeys);
        plan.buildModel = makeModelBuilder(plan.Model, plan.columnPlans);
      }
      processRows = makeInterpretedRowsProcessor(
        plans,
        planCount,
        rootScopeKeyIsRootPkId,
        rootScopeKeyIsRootPkId
          ? makePkIdGetter(rootPrimaryKeyRowKeys)
          : makeRootScopeKeyGetter(rootPrimaryKeyRowKeys)
      );
    }

    return {
      keys,
      planCount,
      rootEntity,
      processRows
    };
  };

  /* Query shapes repeat: the same SELECT runs over and over. Plans are keyed
   * off the (ordered) row key list, which V8 hands back as internalized
   * strings, so a cache hit is a pointer-comparison scan.
   */
  const MAX_QUERY_PLAN_CACHE = 64;
  const queryPlanCache: Array<IQueryPlan> = [];

  const getQueryPlan = (sampleRow: any): IQueryPlan => {
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
    getQueryPlan(result[0]).processRows(result, result.length, models);
    const Collection = getEntityByModel(models[0]).Collection;
    return <T>new Collection({ models });
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
