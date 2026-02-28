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

  interface IRowColumnPlan {
    rowKey: string;
    propertyName: string;
  }
  interface IEntityRowPlan {
    entity: IEntityInternal<IModel>;
    columnPlans: Array<IRowColumnPlan>;
    primaryKeyPropertyNames: Array<string>;
  }

  const getPkIdFromProperties = (
    props: any,
    primaryKeyPropertyNames: Array<string>
  ): string => {
    let id = '';
    for (let i = 0; i < primaryKeyPropertyNames.length; i++) {
      const part = props[primaryKeyPropertyNames[i]];
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
        const primaryKeyPropertyNames = entity.primaryKeys.map((pk: string) => {
          return entity.columnToPropertyMap.get(pk) || pk;
        });
        plan = {
          entity,
          columnPlans: [],
          primaryKeyPropertyNames
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
    scopedModelCacheByEntity: Map<IEntityInternal<IModel>, Map<string, IModel>>,
    rootScopeKey: string
  ): Array<IModel> => {
    const models = new Array<IModel>(entityRowPlans.length);
    for (let i = 0; i < entityRowPlans.length; i++) {
      const plan = entityRowPlans[i];
      const props: any = {};
      for (let j = 0; j < plan.columnPlans.length; j++) {
        const columnPlan = plan.columnPlans[j];
        props[columnPlan.propertyName] = row[columnPlan.rowKey];
      }

      const pkId = getPkIdFromProperties(props, plan.primaryKeyPropertyNames);
      if (pkId) {
        const scopedPkId = `${rootScopeKey}#${pkId}`;
        let entityCache = scopedModelCacheByEntity.get(plan.entity);
        if (!entityCache) {
          entityCache = new Map<string, IModel>();
          scopedModelCacheByEntity.set(plan.entity, entityCache);
        } else {
          const existing = entityCache.get(scopedPkId);
          if (existing) {
            models[i] = existing;
            continue;
          }
        }
        const model = new plan.entity.Model(props);
        entityCache.set(scopedPkId, model);
        models[i] = model;
      } else {
        models[i] = new plan.entity.Model(props);
      }
    }
    return models;
  };

  type IModelsByEntity = Map<IEntityInternal<IModel>, Map<string, IModel>>;
  type IModelsByRootAndEntity = Map<string, IModelsByEntity>;

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

  const ensureRootEntityModels = (
    rootScopeKey: string,
    modelsByRootAndEntity: IModelsByRootAndEntity
  ): IModelsByEntity => {
    let modelsByEntity = modelsByRootAndEntity.get(rootScopeKey);
    if (!modelsByEntity) {
      modelsByEntity = new Map<IEntityInternal<IModel>, Map<string, IModel>>();
      modelsByRootAndEntity.set(rootScopeKey, modelsByEntity);
    }
    return modelsByEntity;
  };

  const ensureEntityModelsForRoot = (
    rootScopeKey: string,
    entity: IEntityInternal<IModel>,
    modelsByRootAndEntity: IModelsByRootAndEntity
  ): Map<string, IModel> => {
    const modelsByEntity = ensureRootEntityModels(
      rootScopeKey,
      modelsByRootAndEntity
    );
    let models = modelsByEntity.get(entity);
    if (!models) {
      models = new Map<string, IModel>();
      modelsByEntity.set(entity, models);
    }
    return models;
  };

  // Phase 2: wire directional refs and inverse collections across
  // the already materialized models within one root scope.
  const linkRootScopeRelationships = (modelsByEntity: IModelsByEntity) => {
    const collectionMembership = new WeakMap<IModel, Map<string, Set<string>>>();
    for (const [entity, modelMap] of modelsByEntity) {
      for (const model of modelMap.values()) {
        const refs = entity.referencesEntries;
        for (let j = 0; j < refs.length; j++) {
          const ref = refs[j];
          const targetEntity = getEntityByModelClass(ref.ModelClass);
          const targetModels = modelsByEntity.get(targetEntity);
          if (!targetModels) {
            continue;
          }
          const refId = model[ref.property as keyof typeof model];
          if (refId == null) {
            continue;
          }
          const target = targetModels.get(String(refId));
          if (!target) {
            continue;
          }

          model[targetEntity.displayName as keyof typeof model] = target;

          let collection =
            target[entity.collectionDisplayName as keyof typeof target];
          if (!collection) {
            const Collection = entity.Collection;
            collection = new Collection({ models: [] });
            target[entity.collectionDisplayName as keyof typeof target] =
              collection;
          }

          let byCollection = collectionMembership.get(target);
          if (!byCollection) {
            byCollection = new Map<string, Set<string>>();
            collectionMembership.set(target, byCollection);
          }
          let memberIds = byCollection.get(entity.collectionDisplayName);
          if (!memberIds) {
            memberIds = new Set<string>();
            byCollection.set(entity.collectionDisplayName, memberIds);
          }
          const modelId = model.constructor.name + ':' + entity.getPkId(model);
          if (!memberIds.has(modelId)) {
            collection.models.push(model);
            memberIds.add(modelId);
          }
        }
      }
    }
  };

  /*
   * createFromDatabase architecture:
   * 1) Compile row plans once (column -> property mapping per entity/table).
   * 2) Materialize models per row with scoped de-duplication by root scope key.
   * 3) Index models by root scope + entity + entity primary key.
   * 4) Link directional refs and inverse collections within each root scope.
   * 5) Return root models in first-seen root scope order.
   */
  const createFromDatabase = <T extends ICollection<IModel>>(rows: any): T => {
    const result = Array.isArray(rows) ? rows : [rows];
    const len = result.length;
    const entityRowPlans = buildEntityRowPlans(result[0]);
    const rootEntity = entityRowPlans[0].entity;
    const rootPrimaryKeys = rootEntity.primaryKeys;
    const scopedModelCacheByEntity = new Map<
      IEntityInternal<IModel>,
      Map<string, IModel>
    >();
    const rootScopeOrder: Array<string> = [];
    const rootModelsByScopeKey = new Map<string, IModel>();
    const modelsByRootAndEntity: IModelsByRootAndEntity = new Map();

    // Phase 1: materialize and index model instances by root scope + entity.
    for (let i = 0; i < len; i++) {
      const row = result[i];
      const rootScopeKey = getRootScopeKey(row, rootEntity, rootPrimaryKeys);
      const models = materializeModelsFromRow(
        row,
        entityRowPlans,
        scopedModelCacheByEntity,
        rootScopeKey
      );
      for (let j = 0; j < models.length; j++) {
        const model = models[j];
        const plan = entityRowPlans[j];
        const pkId = plan.entity.getPkId(model);
        if (!pkId) {
          continue;
        }
        ensureEntityModelsForRoot(
          rootScopeKey,
          plan.entity,
          modelsByRootAndEntity
        ).set(pkId, model);
      }
      const rootModel = models[0];
      if (!rootModelsByScopeKey.has(rootScopeKey)) {
        rootScopeOrder.push(rootScopeKey);
        rootModelsByScopeKey.set(rootScopeKey, rootModel);
      }
    }

    // Phase 2: link references and collection membership per root scope.
    for (let i = 0; i < rootScopeOrder.length; i++) {
      const rootScopeKey = rootScopeOrder[i];
      linkRootScopeRelationships(
        ensureRootEntityModels(rootScopeKey, modelsByRootAndEntity)
      );
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
