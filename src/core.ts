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
 * So a query shape is compiled once into a single specialized row processor.
 * All of the column names, property names, entity slots and reference targets
 * become literals, which turns dynamic keyed access into monomorphic named
 * access and gives every entity its own `new Model(...)` call site.
 *
 * `makeInterpretedRowProcessor` is the semantically identical fallback used
 * where function construction is unavailable (a strict CSP, for example).
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

/* Per root scope, models are indexed by entity and primary key id. Most scopes
 * hold a single model per entity, so the first entry for an entity lives
 * inline in `slots` ([pkId, model] pairs) and a Map is only allocated for
 * entities that actually accumulate more than one model.
 */
interface IRootScopeState {
  slots: Array<any>;
  maps: Array<Map<string, IModel> | void> | void;
}
interface IRowScratch {
  createdIndexes: Array<number>;
  createdModels: Array<IModel>;
  linkedTargets: Array<IModel>;
}
type IRowProcessor = (
  row: any,
  state: IRootScopeState,
  rootScopeKey: string,
  scratch: IRowScratch
) => IModel;

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

/* Slot access is shared by the compiled and interpreted processors rather
 * than inlined into generated source: one small, always-hot function keeps
 * generated row processors small enough to reach the optimizing tier quickly.
 */
const lookupModel = (
  state: IRootScopeState,
  index: number,
  key: string
): IModel | void => {
  const slots = state.slots;
  const base = index << 1;
  if (slots[base] === key) {
    return slots[base + 1];
  }
  const maps = state.maps;
  if (maps === void 0) {
    return void 0;
  }
  const map = maps[index];
  return map === void 0 ? void 0 : map.get(key);
};

const storeModel = (
  state: IRootScopeState,
  index: number,
  key: string,
  model: IModel,
  planCount: number
): void => {
  const slots = state.slots;
  const base = index << 1;
  if (slots[base] === void 0) {
    slots[base] = key;
    slots[base + 1] = model;
    return;
  }
  let maps = state.maps;
  if (maps === void 0) {
    maps = new Array(planCount).fill(void 0);
    state.maps = maps;
  }
  let map = maps[index];
  if (map === void 0) {
    map = new Map<string, IModel>();
    maps[index] = map;
  }
  map.set(key, model);
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

const makeCompiledRowProcessor = (
  plans: Array<IEntityRowPlan>,
  planCount: number,
  rootScopeKeyIsRootPkId: boolean
): IRowProcessor | void => {
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

  let prologue = '';
  for (let p = 0; p < planCount; p++) {
    prologue +=
      'var M' + p + '=P[' + p + '].Model,C' + p + '=P[' + p + '].Collection;';
  }

  let declarations = 'var e,v,k,t,col,s,root;';
  for (let p = 0; p < planCount; p++) {
    declarations += 'var m' + p + ';';
  }
  for (let l = 0; l < maxRefCount - 1; l++) {
    declarations += 'var l' + l + ';';
  }

  // Phase 1: materialize (or reuse) this row's model instances. A model local
  // is left undefined unless this row is the one that created it, which is
  // also what phase 2 keys off.
  let body = '';
  for (let p = 0; p < planCount; p++) {
    const plan = plans[p];
    const modelVar = 'm' + p;
    const construct = 'new M' + p + '(' + propsLiteral(plan.columnPlans) + ')';
    body +=
      p === 0 && rootScopeKeyIsRootPkId
        ? 'k=rootScopeKey;'
        : pkIdSource(plan.primaryKeyRowKeys, 'k');
    body += modelVar + '=undefined;';
    body += 'if(k!==""){';
    body += 'if((e=LU(state,' + p + ',k))===undefined){';
    body += modelVar + '=' + construct + ';';
    body += 'ST(state,' + p + ',k,' + modelVar + ',' + planCount + ');';
    body += p === 0 ? 'root=m0;}else{root=e;}}' : '}}';
    if (p === 0) {
      // A root without a primary key still yields a model; it just cannot be
      // de-duplicated or linked to.
      body += 'else{root=' + construct + ';}';
    }
  }

  // Phase 2: link newly created models to the models they reference.
  for (let p = 0; p < planCount; p++) {
    const plan = plans[p];
    const refCount = plan.refCount;
    if (refCount === 0) {
      continue;
    }
    const collectionKey = literal(plan.collectionDisplayName);
    body += 'if(m' + p + '!==undefined){s=m' + p + ';';
    for (let l = 0; l < refCount - 1; l++) {
      body += 'l' + l + '=undefined;';
    }
    for (let r = 0; r < refCount; r++) {
      const ref = plan.refs[r];
      body += 'if((v=s[' + literal(ref.property) + '])!=null){';
      body +=
        't=LU(state,' + ref.targetIndex + ',typeof v==="string"?v:String(v));';
      body += 'if(t!==undefined){';
      body += 's[' + literal(ref.targetDisplayName) + ']=t;';
      body += 'if(!(col=t[' + collectionKey + '])){';
      body +=
        'col=new C' + p + '({models:[]});DC(t,' + collectionKey + ',col);}';
      if (r === 0) {
        body += 'col.models.push(s);';
      } else {
        // A model is only linked at creation time, so it can reach a given
        // collection twice only when it holds several references to the same
        // entity (and more than one of them resolves to the same target).
        let guard = 't!==l0';
        for (let l = 1; l < r; l++) {
          guard += '&&t!==l' + l;
        }
        body += 'if(' + guard + '){col.models.push(s);}';
      }
      if (r < refCount - 1) {
        body += 'l' + r + '=t;';
      }
      body += '}}';
    }
    body += '}';
  }

  try {
    compileBudget--;
    // eslint-disable-next-line no-new-func
    return new Function(
      'P',
      'LU',
      'ST',
      'DC',
      USE_STRICT +
        prologue +
        'return function processRow(row,state,rootScopeKey){' +
        declarations +
        body +
        'return root;};'
    )(plans, lookupModel, storeModel, defineCollection) as IRowProcessor | void;
  } catch (e) {
    return void 0;
  }
};

const makeInterpretedRowProcessor = (
  plans: Array<IEntityRowPlan>,
  planCount: number,
  rootScopeKeyIsRootPkId: boolean
): IRowProcessor => {
  const rootGetPkId = plans[0].getPkId;
  return (
    row: any,
    state: IRootScopeState,
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
        const existing = lookupModel(state, p, pkId);
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
        storeModel(state, p, pkId, model, planCount);
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
        const targetPkId = typeof refId === 'string' ? refId : String(refId);
        const targetModel = lookupModel(state, ref.targetIndex, targetPkId);
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
    getRootScopeKey: (row: any) => string;
    processRow: IRowProcessor;
    needsScratch: boolean;
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
    // primary key id are the same string, so it only gets built once per row.
    const rootScopeKeyIsRootPkId = rootPrimaryKeyRowKeys.length === 1;

    let processRow = makeCompiledRowProcessor(
      plans,
      planCount,
      rootScopeKeyIsRootPkId
    );
    let needsScratch = false;
    if (processRow === void 0) {
      for (let i = 0; i < planCount; i++) {
        const plan = plans[i];
        plan.getPkId = makePkIdGetter(plan.primaryKeyRowKeys);
        plan.buildModel = makeModelBuilder(plan.Model, plan.columnPlans);
      }
      processRow = makeInterpretedRowProcessor(
        plans,
        planCount,
        rootScopeKeyIsRootPkId
      );
      needsScratch = true;
    }

    return {
      keys,
      planCount,
      rootEntity,
      getRootScopeKey: rootScopeKeyIsRootPkId
        ? makePkIdGetter(rootPrimaryKeyRowKeys)
        : makeRootScopeKeyGetter(rootPrimaryKeyRowKeys),
      processRow,
      needsScratch
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
   * 1) Look up (or compile) the row processor for this query shape.
   * 2) Materialize models per row with scoped de-duplication by root scope key.
   * 3) Index models by root scope + entity + entity primary key.
   * 4) Link refs incrementally as new models appear.
   * 5) Return root models in first-seen root scope order.
   */
  const createFromDatabase = <T extends ICollection<IModel>>(rows: any): T => {
    const result = Array.isArray(rows) ? rows : [rows];
    const len = result.length;
    const queryPlan = getQueryPlan(result[0]);
    const planCount = queryPlan.planCount;
    const getRootScopeKey = queryPlan.getRootScopeKey;
    const processRow = queryPlan.processRow;
    const scratch: IRowScratch = queryPlan.needsScratch
      ? {
          createdIndexes: new Array(planCount),
          createdModels: new Array(planCount),
          linkedTargets: []
        }
      : (void 0 as any);

    const models: Array<IModel> = [];
    const slotCount = planCount << 1;
    /* Rows for one root arrive together, so the current scope is tracked
     * directly and the lookup map is only built once a second distinct root
     * scope shows up - single-root results never allocate it.
     */
    let rootScopeStateByKey: Map<string, IRootScopeState> | void = void 0;
    let currentRootScopeKey = '';
    let currentState: IRootScopeState | void = void 0;

    for (let i = 0; i < len; i++) {
      const row = result[i];
      const rootScopeKey = getRootScopeKey(row);

      let state: IRootScopeState;
      let isNewScope = false;
      if (currentState !== void 0 && rootScopeKey === currentRootScopeKey) {
        state = currentState;
      } else {
        let existingState: IRootScopeState | void = void 0;
        if (currentState !== void 0) {
          if (rootScopeStateByKey === void 0) {
            rootScopeStateByKey = new Map<string, IRootScopeState>();
            rootScopeStateByKey.set(currentRootScopeKey, currentState);
          }
          existingState = rootScopeStateByKey.get(rootScopeKey);
        }
        if (existingState === void 0) {
          state = { slots: new Array(slotCount).fill(void 0), maps: void 0 };
          if (rootScopeStateByKey !== void 0) {
            rootScopeStateByKey.set(rootScopeKey, state);
          }
          isNewScope = true;
        } else {
          state = existingState;
        }
        currentRootScopeKey = rootScopeKey;
        currentState = state;
      }

      const rootModel = processRow(row, state, rootScopeKey, scratch);
      if (isNewScope) {
        models.push(rootModel);
      }
    }

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
