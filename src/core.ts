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
    rootKey: string | IModel
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

      // Returns unique identifier of model (the values of the primary keys)
      const getPkId = (model: IModel): string => {
        return primaryKeys
          .map((key: string) => model[key as keyof typeof model])
          .join('');
      };

      const references = columns
        .filter((x: IColumnInternal) => x.references)
        .reduce(
          (accum: any, item: IColumnInternal) =>
            Object.assign({}, accum, {
              [item.property]: item.references
            }),
          {}
        );

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
        getPkId
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

  const getEntityByModel = (model: IModel): IEntityInternal<IModel> => {
    const entity = modelToEntityMap.get(model.constructor);
    if (!entity) {
      throw new Error(`Could not find entity for class ${model.constructor}`);
    }
    return entity;
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
    clump = clump.map((x: Array<IModel>) => Object.values(x));
    const root = clump[0][0];
    clump = clump.map((row: Array<IModel>) =>
      row.filter((item: IModel, index: number) => index !== 0)
    );
    const built = { [getEntityByModel(root).displayName]: root };

    let nodes = [root];

    // Wowzer is this both CPU and Memory inefficient
    clump.forEach((array: Array<IModel>) => {
      array.forEach((_model: IModel) => {
        const nodeAlreadySeen = nodes.find(
          (x: IModel) =>
            x.constructor.name === _model.constructor.name &&
            getEntityByModel(x).getPkId(x) ===
              getEntityByModel(_model).getPkId(_model)
        );
        const model = nodeAlreadySeen || _model;
        const isNodeAlreadySeen = !!nodeAlreadySeen;
        const nodePointingToIt = nodes.find((node) => {
          const indexes = Object.values(getEntityByModel(node).references)
            .map((x: IModelClass, i: number) =>
              x === model.constructor ? i : null
            )
            .filter((x: number | null, i) => x != null) as Array<number>;
          if (!indexes.length) {
            return false;
          }
          for (const index of indexes) {
            const property = Object.keys(getEntityByModel(node).references)[
              index
            ];
            if (node[property] === model.id) {
              return true;
            }
          }
          return false;
        });
        // For first obj type which is has an instance in nodes array,
        // get its index in nodes array
        const indexOfOldestParent =
          array.reduce((answer: number | null, obj: IModel) => {
            if (answer != null) {
              return answer;
            }
            const index = nodes.findIndex(
              (n) => n.constructor === obj.constructor
            );
            if (index !== -1) {
              return index;
            }
            return null;
          }, null) || 0;
        const parentHeirarchy = [
          root,
          ...nodes.slice(0, indexOfOldestParent + 1).reverse()
        ];
        const nodeItPointsTo = parentHeirarchy.find((parent) => {
          const index = Object.values(
            getEntityByModel(model).references
          ).indexOf(parent.constructor);
          if (index === -1) {
            return false;
          }
          const property = Object.keys(getEntityByModel(model).references)[
            index
          ];
          return model[property as keyof typeof model] === parent.id;
        });
        if (isNodeAlreadySeen) {
          if (nodeItPointsTo && !nodePointingToIt) {
            nodes = [model, ...nodes];
            return;
          }
          // If the nodePointingToIt (eg, parcel_event) is part of an
          // existing collection on this node (eg, parcel) which is a
          // nodeAlreadySeen, early return so we don't create it (parcel) on
          // the nodePointingToIt (parcel_event), since it (parcel) has been
          // shown to be the parent (of parcel_events).
          if (nodePointingToIt) {
            const ec =
              model[
                getEntityByModel(nodePointingToIt)
                  .collectionDisplayName as keyof typeof model
              ];
            if (ec && ec.models.find((m: IModel) => m === nodePointingToIt)) {
              nodes = [model, ...nodes];
              return;
            }
          }
        }
        if (nodePointingToIt) {
          nodePointingToIt[getEntityByModel(model).displayName] = model;
        } else if (nodeItPointsTo) {
          let collection =
            nodeItPointsTo[getEntityByModel(model).collectionDisplayName];
          if (collection) {
            collection.models.push(model);
          } else {
            const Collection = getEntityByModel(model).Collection;
            nodeItPointsTo[getEntityByModel(model).collectionDisplayName] =
              new Collection({
                models: [model]
              });
          }
        } else {
          if (!getEntityByModel(model).getPkId(model)) {
            // If the join is fruitless; todo: add a test for this path
            return;
          }
          throw Error(
            `Could not find how this BO fits: ${JSON.stringify(model)} ${
              getEntityByModel(model).tableName
            }`
          );
        }
        nodes = [model, ...nodes];
      });
    });

    return built;
  };

  /*
   * Clump array of flat objects into groups based on id of root
   * In:
   *  [
   *    [Article {id: 32}, ArticleTag {id: 54}]
   *    [Article {id: 32}, ArticleTag {id: 55}]
   *    [Article {id: 33}, ArticleTag {id: 56}]
   *  ]
   * Out:
   *  [
   *    [
   *      [Article {id: 32}, ArticleTag {id: 54}]
   *      [Article {id: 32}, ArticleTag {id: 55}]
   *    ]
   *    [
   *      [Article {id: 33}, ArticleTag {id: 56}]
   *    ]
   *  ]
   */
  const clumpIntoGroups = (
    processed: Array<Array<IModel>>
  ): Array<Array<Array<IModel>>> => {
    const root = processed[0][0];
    const rootBo = root.constructor;
    const clumps = processed.reduce((accum: any, item: Array<IModel>) => {
      const id = getEntityByModel(root)
        .primaryKeys.map(
          (key: string) =>
            item.find((x: IModel) => x.constructor === rootBo)?.[key]
        )
        .join('@');
      if (accum.has(id)) {
        accum.set(id, [...accum.get(id), item]);
      } else {
        accum.set(id, [item]);
      }
      return accum;
    }, new Map());
    return [...clumps.values()];
  };

  const mapToBos = (objectified: any) => {
    return Object.keys(objectified).map((tableName) => {
      const entity = getEntityByTableName(tableName);
      const propified = Object.keys(objectified[tableName]).reduce(
        (obj: any, column) => {
          let propertyName =
            entity.propertyNames[entity.columnNames.indexOf(column)];
          if (!propertyName) {
            if (column.startsWith('meta_')) {
              propertyName = camelCase(column);
            } else {
              throw Error(
                `No property name for "${column}" in business object "${entity.displayName}". Non-spec'd columns must begin with "meta_".`
              );
            }
          }
          obj[propertyName] = objectified[tableName][column];
          return obj;
        },
        {}
      );
      return new entity.Model(propified);
    });
  };

  /*
   * Make objects (based on special table#column names) from flat database
   * return value.
   */
  const objectifyDatabaseResult = (result: object) => {
    return Object.keys(result).reduce((obj: any, text: string) => {
      const tableName = text.split('#')[0];
      const column = text.split('#')[1];
      if (!tableName || !column) {
        throw new Error('Column names must be namespaced to table');
      }
      obj[tableName] = obj[tableName] || {};
      obj[tableName][column] = result[text as keyof typeof result];
      return obj;
    }, {});
  };

  const createFromDatabase = <T extends ICollection<IModel>>(rows: any): T => {
    const result = Array.isArray(rows) ? rows : [rows];
    const objectified = result.map(objectifyDatabaseResult);
    const boified = objectified.map(mapToBos);
    const clumps = clumpIntoGroups(boified);
    const nested = clumps.map(nestClump);
    const models = nested.map((n) => Object.values(n)[0]);
    const Collection = getEntityByModel(models[0]).Collection;
    return <T>new Collection({ models });
  };

  const createAnyFromDatabase = <T extends ICollection<IModel>>(
    rows: any,
    rootKey: string | IModel
  ): T => {
    if (!rows || !rows.length) {
      const Collection =
        typeof rootKey === 'string'
          ? getEntityByTableName(rootKey).Collection
          : getEntityByModel(rootKey).Collection;
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
