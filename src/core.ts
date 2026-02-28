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
      for (let i = 0; i < columnNames.length; i++) {
        columnToPropertyMap.set(columnNames[i], propertyNames[i]);
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

  interface IRowColumnPlan {
    rowKey: string;
    propertyName: string;
  }
  interface IEntityRowPlan {
    entity: IEntityInternal<IModel>;
    columnPlans: Array<IRowColumnPlan>;
    primaryKeyRowKeys: Array<string>;
  }

  const getPkIdFromRow = (row: any, primaryKeyRowKeys: Array<string>): string => {
    let id = '';
    for (let i = 0; i < primaryKeyRowKeys.length; i++) {
      const part = row[primaryKeyRowKeys[i]];
      if (part !== void 0 && part !== null) {
        id += String(part);
      }
    }
    return id;
  };

  const buildEntityRowPlans = (sampleRow: any): Array<IEntityRowPlan> => {
    const plansByTable = new Map<string, IEntityRowPlan>();
    const tableOrder: Array<string> = [];
    for (const text in sampleRow) {
      if (!Object.prototype.hasOwnProperty.call(sampleRow, text)) {
        continue;
      }
      const hashIndex = text.indexOf('#');
      if (hashIndex === -1) {
        throw new Error('Column names must be namespaced to table');
      }
      const tableName = text.substring(0, hashIndex);
      const column = text.substring(hashIndex + 1);

      let plan = plansByTable.get(tableName);
      if (!plan) {
        const entity = getEntityByTableName(tableName);
        const primaryKeyRowKeys = entity.primaryKeys.map(
          (pk: string) => `${tableName}#${pk}`
        );
        plan = {
          entity,
          columnPlans: [],
          primaryKeyRowKeys
        };
        plansByTable.set(tableName, plan);
        tableOrder.push(tableName);
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

    const orderedPlans = new Array<IEntityRowPlan>(tableOrder.length);
    for (let i = 0; i < tableOrder.length; i++) {
      orderedPlans[i] = plansByTable.get(tableOrder[i]) as IEntityRowPlan;
    }
    return orderedPlans;
  };

  const materializeModelsFromRow = (
    row: any,
    entityRowPlans: Array<IEntityRowPlan>,
    rootScopedModelsByEntity: IModelsByEntity,
    rowModels: Array<IModel | void>,
    rowModelPkIds: Array<string>,
    rowCreatedWithPkIndexes: Array<number>
  ): IModel => {
    rowCreatedWithPkIndexes.length = 0;
    for (let i = 0; i < entityRowPlans.length; i++) {
      const plan = entityRowPlans[i];
      const pkId = getPkIdFromRow(row, plan.primaryKeyRowKeys);
      rowModelPkIds[i] = pkId;
      if (pkId) {
        let modelsForEntity = rootScopedModelsByEntity.get(plan.entity);
        if (!modelsForEntity) {
          modelsForEntity = new Map<string, IModel>();
          rootScopedModelsByEntity.set(plan.entity, modelsForEntity);
        } else {
          const existing = modelsForEntity.get(pkId);
          if (existing) {
            rowModels[i] = existing;
            continue;
          }
        }
      } else if (i !== 0) {
        // No primary key means this is typically an outer-joined null row.
        // Skip model construction for non-root entities since it cannot link.
        rowModels[i] = void 0;
        continue;
      }
      const props: any = {};
      for (let j = 0; j < plan.columnPlans.length; j++) {
        const columnPlan = plan.columnPlans[j];
        props[columnPlan.propertyName] = row[columnPlan.rowKey];
      }
      const model = new plan.entity.Model(props);
      if (pkId) {
        // modelsForEntity is guaranteed to be initialized above for pk rows.
        (rootScopedModelsByEntity.get(plan.entity) as Map<string, IModel>).set(
          pkId,
          model
        );
        rowCreatedWithPkIndexes.push(i);
      }
      rowModels[i] = model;
    }
    return rowModels[0] as IModel;
  };

  type IModelsByEntity = Map<IEntityInternal<IModel>, Map<string, IModel>>;
  interface IRootScopeState {
    modelsByEntity: IModelsByEntity;
    collectionMembership?: WeakMap<IModel, Map<IEntityInternal<IModel>, Set<string>>>;
  }
  type IRootScopeStateByKey = Map<string, IRootScopeState>;

  const getRootScopeKey = (
    row: any,
    rootEntity: IEntityInternal<IModel>,
    rootPrimaryKeys: Array<string>
  ): string => {
    let rootScopeKey = '';
    for (let i = 0; i < rootPrimaryKeys.length; i++) {
      if (i > 0) {
        rootScopeKey += '@';
      }
      const value = row[`${rootEntity.tableName}#${rootPrimaryKeys[i]}`];
      rootScopeKey += value === void 0 || value === null ? '' : String(value);
    }
    return rootScopeKey;
  };

  const ensureRootScopeState = (
    rootScopeKey: string,
    rootScopeStateByKey: IRootScopeStateByKey
  ): IRootScopeState => {
    let state = rootScopeStateByKey.get(rootScopeKey);
    if (!state) {
      state = {
        modelsByEntity: new Map<IEntityInternal<IModel>, Map<string, IModel>>()
      };
      rootScopeStateByKey.set(rootScopeKey, state);
    }
    return state;
  };

  const ensureCollectionMembership = (
    rootScopeState: IRootScopeState
  ): WeakMap<IModel, Map<IEntityInternal<IModel>, Set<string>>> => {
    if (!rootScopeState.collectionMembership) {
      rootScopeState.collectionMembership = new WeakMap<
        IModel,
        Map<IEntityInternal<IModel>, Set<string>>
      >();
    }
    return rootScopeState.collectionMembership;
  };

  const linkSourceToTarget = ({
    sourceEntity,
    sourceModel,
    sourceModelPkId,
    targetEntity,
    targetModel,
    collectionMembership
  }: {
    sourceEntity: IEntityInternal<IModel>;
    sourceModel: IModel;
    sourceModelPkId: string;
    targetEntity: IEntityInternal<IModel>;
    targetModel: IModel;
    collectionMembership: WeakMap<IModel, Map<IEntityInternal<IModel>, Set<string>>>;
  }) => {
    sourceModel[targetEntity.displayName as keyof typeof sourceModel] = targetModel;

    let collection =
      targetModel[sourceEntity.collectionDisplayName as keyof typeof targetModel];
    if (!collection) {
      const Collection = sourceEntity.Collection;
      collection = new Collection({ models: [] });
      targetModel[sourceEntity.collectionDisplayName as keyof typeof targetModel] =
        collection;
    }

    let byCollection = collectionMembership.get(targetModel);
    if (!byCollection) {
      byCollection = new Map<IEntityInternal<IModel>, Set<string>>();
      collectionMembership.set(targetModel, byCollection);
    }
    let memberIds = byCollection.get(sourceEntity);
    if (!memberIds) {
      memberIds = new Set<string>();
      byCollection.set(sourceEntity, memberIds);
    }
    if (!memberIds.has(sourceModelPkId)) {
      collection.models.push(sourceModel);
      memberIds.add(sourceModelPkId);
    }
  };

  /*
   * createFromDatabase architecture:
   * 1) Compile row plans once (column -> property mapping per entity/table).
   * 2) Materialize models per row with scoped de-duplication by root scope key.
   * 3) Index models by root scope + entity + entity primary key.
   * 4) Link refs incrementally as new models appear.
   * 5) Return root models in first-seen root scope order.
   */
  const createFromDatabase = <T extends ICollection<IModel>>(rows: any): T => {
    const result = Array.isArray(rows) ? rows : [rows];
    const len = result.length;
    const entityRowPlans = buildEntityRowPlans(result[0]);
    const selectedEntities = new Set<IEntityInternal<IModel>>();
    for (let i = 0; i < entityRowPlans.length; i++) {
      selectedEntities.add(entityRowPlans[i].entity);
    }
    const applicableRefPlans = new Map<
      IEntityInternal<IModel>,
      Array<{ property: string; targetEntity: IEntityInternal<IModel> }>
    >();
    for (let i = 0; i < entityRowPlans.length; i++) {
      const entity = entityRowPlans[i].entity;
      const refs = entityReferencePlans.get(entity) || [];
      const filteredRefs = refs.filter((ref) => selectedEntities.has(ref.targetEntity));
      applicableRefPlans.set(entity, filteredRefs);
    }
    const rootEntity = entityRowPlans[0].entity;
    const rootPrimaryKeys = rootEntity.primaryKeys;
    const rootScopeOrder: Array<string> = [];
    const rootModelsByScopeKey = new Map<string, IModel>();
    const rootScopeStateByKey: IRootScopeStateByKey = new Map();
    let currentRootScopeKey: string | void = void 0;
    let currentRootScopeState: IRootScopeState | void = void 0;
    const rowModels = new Array<IModel | void>(entityRowPlans.length);
    const rowModelPkIds = new Array<string>(entityRowPlans.length);
    const rowCreatedWithPkIndexes: Array<number> = [];

    // Phase 1: materialize and index model instances by root scope + entity.
    for (let i = 0; i < len; i++) {
      const row = result[i];
      const rootScopeKey = getRootScopeKey(row, rootEntity, rootPrimaryKeys);
      let rootScopeState: IRootScopeState | void = currentRootScopeState;
      if (!rootScopeState || rootScopeKey !== currentRootScopeKey) {
        rootScopeState = ensureRootScopeState(rootScopeKey, rootScopeStateByKey);
        currentRootScopeKey = rootScopeKey;
        currentRootScopeState = rootScopeState;
      }
      const rootModel = materializeModelsFromRow(
        row,
        entityRowPlans,
        rootScopeState.modelsByEntity,
        rowModels,
        rowModelPkIds,
        rowCreatedWithPkIndexes
      );
      if (!rootModelsByScopeKey.has(rootScopeKey)) {
        rootScopeOrder.push(rootScopeKey);
        rootModelsByScopeKey.set(rootScopeKey, rootModel);
      }

      for (let c = 0; c < rowCreatedWithPkIndexes.length; c++) {
        const j = rowCreatedWithPkIndexes[c];
        const sourceModel = rowModels[j] as IModel;
        const sourceModelPkId = rowModelPkIds[j];
        const sourceEntity = entityRowPlans[j].entity;

        const refs = applicableRefPlans.get(sourceEntity);
        if (!refs || refs.length === 0) {
          continue;
        }

        for (let r = 0; r < refs.length; r++) {
          const ref = refs[r];
          const refId = sourceModel[ref.property as keyof typeof sourceModel];
          if (refId == null) {
            continue;
          }
          const targetPkId = String(refId);
          const target = rootScopeState.modelsByEntity
            .get(ref.targetEntity)
            ?.get(targetPkId);
          if (target) {
            linkSourceToTarget({
              sourceEntity,
              sourceModel,
              sourceModelPkId,
              targetEntity: ref.targetEntity,
              targetModel: target,
              collectionMembership: ensureCollectionMembership(rootScopeState)
            });
          }
        }
      }
    }

    const models = new Array<IModel>(rootScopeOrder.length);
    for (let i = 0; i < rootScopeOrder.length; i++) {
      models[i] = rootModelsByScopeKey.get(rootScopeOrder[i]) as IModel;
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
