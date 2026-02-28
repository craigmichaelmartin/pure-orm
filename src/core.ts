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

  /*
   * In:
   *  [
   *    [Article {id: 32}, ArticleTag {id: 54}]
   *    [Article {id: 32}, ArticleTag {id: 55}]
   *  ]
   * Out:
   *  Article {id: 32, ArticleTags articleTags: [ArticleTag {id: 54}, ArticleTag {id: 55}]
   */
  const nestClump = (clump: Array<Array<IModel>>): object => {
    const normalized = new Array<Array<IModel>>(clump.length);
    for (let i = 0; i < clump.length; i++) {
      normalized[i] = Object.values(clump[i]);
    }
    const root = normalized[0][0];
    const rows = new Array<Array<IModel>>(normalized.length);
    for (let i = 0; i < normalized.length; i++) {
      const row = normalized[i];
      const withoutRoot = new Array<IModel>(row.length - 1);
      for (let j = 1; j < row.length; j++) {
        withoutRoot[j - 1] = row[j];
      }
      rows[i] = withoutRoot;
    }
    const rootEntity = getEntityByModel(root);
    const built = { [rootEntity.displayName]: root };

    let nodes: Array<IModel> = [root];
    const seenNodes = new Map<string, IModel>();
    const nodeKey = (model: IModel): string => {
      const entity = getEntityByModel(model);
      return model.constructor.name + ':' + entity.getPkId(model);
    };
    seenNodes.set(nodeKey(root), root);

    const entityCache = new Map<IModel, IEntityInternal<IModel>>();
    const getEntity = (model: IModel): IEntityInternal<IModel> => {
      let entity = entityCache.get(model);
      if (!entity) {
        entity = getEntityByModel(model);
        entityCache.set(model, entity);
      }
      return entity;
    };
    entityCache.set(root, rootEntity);
    const latestNodePointingToByClass = new Map<IModelClass, Map<any, IModel>>();
    const indexNodeRefs = (node: IModel) => {
      const nodeEntity = getEntity(node);
      const refs = nodeEntity.referencesEntries;
      for (let i = 0; i < refs.length; i++) {
        const ref = refs[i];
        const refId = node[ref.property as keyof typeof node];
        if (refId == null) {
          continue;
        }
        let byId = latestNodePointingToByClass.get(ref.ModelClass);
        if (!byId) {
          byId = new Map<any, IModel>();
          latestNodePointingToByClass.set(ref.ModelClass, byId);
        }
        byId.set(refId, node);
      }
    };
    indexNodeRefs(root);

    rows.forEach((array: Array<IModel>) => {
      array.forEach((_model: IModel) => {
        const key = nodeKey(_model);
        const nodeAlreadySeen = seenNodes.get(key);
        const model = nodeAlreadySeen || _model;
        const isNodeAlreadySeen = !!nodeAlreadySeen;
        const modelEntity = getEntity(model);

        const nodePointingToIt = latestNodePointingToByClass
          .get(model.constructor as IModelClass)
          ?.get(model.id);

        // For first obj type which has an instance in nodes array,
        // get its index in nodes array
        let indexOfOldestParent = 0;
        for (let arrayIndex = 0; arrayIndex < array.length; arrayIndex++) {
          const obj = array[arrayIndex];
          const index = nodes.findIndex((n) => n.constructor === obj.constructor);
          if (index !== -1) {
            indexOfOldestParent = index;
            break;
          }
        }

        let nodeItPointsTo: IModel | void = void 0;
        const refs = modelEntity.referencesEntries;
        if (refs.length) {
          let pointsToRoot = false;
          for (let refIndex = 0; refIndex < refs.length; refIndex++) {
            const ref = refs[refIndex];
            if (
              ref.ModelClass === root.constructor &&
              model[ref.property] === root.id
            ) {
              pointsToRoot = true;
              break;
            }
          }
          if (pointsToRoot) {
            nodeItPointsTo = root;
          } else {
            for (let parentIndex = indexOfOldestParent; parentIndex >= 0; parentIndex--) {
              const parent = nodes[parentIndex];
              let pointsToParent = false;
              for (let refIndex = 0; refIndex < refs.length; refIndex++) {
                const ref = refs[refIndex];
                if (
                  ref.ModelClass === parent.constructor &&
                  model[ref.property] === parent.id
                ) {
                  pointsToParent = true;
                  break;
                }
              }
              if (pointsToParent) {
                nodeItPointsTo = parent;
                break;
              }
            }
          }
        }

        if (isNodeAlreadySeen) {
          if (nodeItPointsTo && !nodePointingToIt) {
            nodes.unshift(model);
            indexNodeRefs(model);
            return;
          }
          if (nodePointingToIt) {
            const ec =
              model[
                getEntity(nodePointingToIt)
                  .collectionDisplayName as keyof typeof model
              ];
            if (
              ec &&
              ec.models.some((m: IModel) => m === nodePointingToIt)
            ) {
              nodes.unshift(model);
              indexNodeRefs(model);
              return;
            }
          }
        }
        if (nodePointingToIt) {
          nodePointingToIt[modelEntity.displayName] = model;
        } else if (nodeItPointsTo) {
          let collection = nodeItPointsTo[modelEntity.collectionDisplayName];
          if (collection) {
            collection.models.push(model);
          } else {
            const Collection = modelEntity.Collection;
            nodeItPointsTo[modelEntity.collectionDisplayName] =
              new Collection({
                models: [model]
              });
          }
        } else {
          if (!modelEntity.getPkId(model)) {
            return;
          }
          throw Error(
            `Could not find how this BO fits: ${JSON.stringify(model)} ${
              modelEntity.tableName
            }`
          );
        }
        if (!isNodeAlreadySeen) {
          seenNodes.set(key, model);
        }
        nodes.unshift(model);
        indexNodeRefs(model);
      });
    });

    return built;
  };

  /*
   * Clump array of flat objects into groups based on id of root
   */
  const clumpIntoGroups = (
    processed: Array<Array<IModel>>
  ): Array<Array<Array<IModel>>> => {
    const root = processed[0][0];
    const rootBo = root.constructor;
    const rootEntity = getEntityByModel(root);
    const primaryKeys = rootEntity.primaryKeys;
    const clumps = new Map<string, Array<Array<IModel>>>();
    let rootIndex = -1;
    for (let i = 0; i < processed[0].length; i++) {
      if (processed[0][i].constructor === rootBo) {
        rootIndex = i;
        break;
      }
    }
    if (rootIndex === -1) {
      rootIndex = 0;
    }

    for (const item of processed) {
      const rootModel =
        item[rootIndex] && item[rootIndex].constructor === rootBo
          ? item[rootIndex]
          : item.find((x: IModel) => x.constructor === rootBo);
      let id = '';
      for (let i = 0; i < primaryKeys.length; i++) {
        if (i > 0) {
          id += '@';
        }
        const value = rootModel?.[primaryKeys[i] as keyof typeof rootModel];
        id += value === void 0 || value === null ? '' : String(value);
      }
      const group = clumps.get(id);
      if (group) {
        group.push(item);
      } else {
        clumps.set(id, [item]);
      }
    }
    return [...clumps.values()];
  };

  const mapToBos = (objectified: any) => {
    const tableNames = Object.keys(objectified);
    const result = new Array(tableNames.length);
    for (let i = 0; i < tableNames.length; i++) {
      const tableName = tableNames[i];
      const entity = getEntityByTableName(tableName);
      const tableData = objectified[tableName];
      const columnToPropertyMap = entity.columnToPropertyMap;
      const propified: any = {};
      for (const column in tableData) {
        let propertyName = columnToPropertyMap.get(column);
        if (!propertyName) {
          if (column.startsWith('meta_')) {
            propertyName = camelCase(column);
          } else {
            throw Error(
              `No property name for "${column}" in business object "${entity.displayName}". Non-spec'd columns must begin with "meta_".`
            );
          }
        }
        propified[propertyName] = tableData[column];
      }
      result[i] = new entity.Model(propified);
    }
    return result;
  };

  /*
   * Make objects (based on special table#column names) from flat database
   * return value.
   */
  const objectifyDatabaseResult = (result: object) => {
    const obj: any = {};
    for (const text in result as any) {
      if (!Object.prototype.hasOwnProperty.call(result, text)) {
        continue;
      }
      const hashIndex = text.indexOf('#');
      if (hashIndex === -1) {
        throw new Error('Column names must be namespaced to table');
      }
      const tableName = text.substring(0, hashIndex);
      const column = text.substring(hashIndex + 1);
      let tableObj = obj[tableName];
      if (!tableObj) {
        tableObj = {};
        obj[tableName] = tableObj;
      }
      tableObj[column] = (result as any)[text];
    }
    return obj;
  };

  const createFromDatabase = <T extends ICollection<IModel>>(rows: any): T => {
    const result = Array.isArray(rows) ? rows : [rows];
    const len = result.length;
    const boified = new Array(len);
    for (let i = 0; i < len; i++) {
      boified[i] = mapToBos(objectifyDatabaseResult(result[i]));
    }
    const clumps = clumpIntoGroups(boified);
    const models = new Array<IModel>(clumps.length);
    for (let i = 0; i < clumps.length; i++) {
      const nested = nestClump(clumps[i]);
      models[i] = Object.values(nested)[0] as IModel;
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
