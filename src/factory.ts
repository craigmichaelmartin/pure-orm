const camelCase = require('camelcase');

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

export interface CreateOptions {
  entities: IEntities<IModel>;
  db: any;
  logError?: (err: Error) => void;
}

export const create = ({
  entities: externalEntities,
  db,
  logError
}: CreateOptions) => {
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

  const getEntityByTableName = (tableName: string): IEntityInternal<IModel> => {
    const entity = entities.find((data) => data.tableName == tableName);
    if (!entity) {
      throw new Error(`Could not find entity for table ${tableName}`);
    }
    return entity;
  };

  const getEntityByModel = (model: IModel): IEntityInternal<IModel> => {
    const entity = entities.find((data) => data.Model == model.constructor);
    if (!entity) {
      throw new Error(`Could not find entity for class ${model.constructor}`);
    }
    return entity;
  };

  const defaultErrorHandler = (err: Error) => {
    if (!(err.name === 'QueryResultError')) {
      if (logError) {
        logError(err);
      }
    }
    throw err;
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
      obj[tableName] = obj[tableName] || {};
      obj[tableName][column] = result[text as keyof typeof result];
      return obj;
    }, {});
  };

  const createFromDatabase = <T extends ICollection<IModel>>(
    _result: Array<object> | object
  ): T | undefined => {
    const result = Array.isArray(_result) ? _result : [_result];
    const objectified = result.map(objectifyDatabaseResult);
    const boified = objectified.map(mapToBos);
    const clumps = clumpIntoGroups(boified);
    const nested = clumps.map(nestClump);
    const models = nested.map((n) => Object.values(n)[0]);
    const Collection = getEntityByModel(models[0]).Collection;
    return models.length ? (new Collection({ models }) as T) : void 0;
  };

  const createOneFromDatabase = <T extends IModel>(_result: any): T => {
    const collection = createFromDatabase<ICollection<IModel>>(_result);
    if (!collection) {
      throw Error('Did not get one.');
    }
    if (!collection || collection.models.length === 0) {
      throw Error('Did not get one.');
    } else if (collection.models.length > 1) {
      throw Error('Got more than one.');
    }
    return collection.models[0] as T;
  };

  const createOneOrNoneFromDatabase = <T extends IModel>(
    _result: any
  ): T | void => {
    if (!_result) {
      return _result;
    }
    const collection = createFromDatabase(_result);
    if (collection && collection.models.length > 1) {
      throw Error('Got more than one.');
    }
    return collection && (collection.models[0] as T);
  };

  const createManyFromDatabase = <T extends ICollection<IModel>>(
    _result: any
  ): T => {
    const collection = createFromDatabase(_result);
    if (!collection || collection.models.length === 0) {
      throw Error('Did not get at least one.');
    }
    return collection as T;
  };

  const getSqlInsertParts = (model: IModel) => {
    const columns = getEntityByModel(model)
      .columnNames.filter(
        (column: string, index: number) =>
          model[
            getEntityByModel(model).propertyNames[index] as keyof typeof model
          ] !== void 0
      )
      .map((col: string) => `"${col}"`)
      .join(', ');
    const values = getEntityByModel(model)
      .propertyNames.map(
        (property: string) => model[property as keyof typeof model]
      )
      .filter((value: any) => value !== void 0);
    const valuesVar = values.map(
      (value: any, index: number) => `$${index + 1}`
    );
    return { columns, values, valuesVar };
  };

  const getSqlUpdateParts = (model: IModel, on = 'id') => {
    const clauseArray = getEntityByModel(model)
      .columnNames.filter(
        (sqlColumn: string, index: number) =>
          model[
            getEntityByModel(model).propertyNames[index] as keyof typeof model
          ] !== void 0
      )
      .map(
        (sqlColumn: string, index: number) => `"${sqlColumn}" = $${index + 1}`
      );
    const clause = clauseArray.join(', ');
    const idVar = `$${clauseArray.length + 1}`;
    const _values = getEntityByModel(model)
      .propertyNames.map(
        (property: string) => model[property as keyof typeof model]
      )
      .filter((value: any) => value !== void 0);
    const values = [..._values, model[on as keyof typeof model]];
    return { clause, idVar, values };
  };

  const getMatchingParts = (model: IModel) => {
    const whereClause = getEntityByModel(model)
      .propertyNames.map((property: string, index: number) =>
        model[property as keyof typeof model] != null
          ? `"${getEntityByModel(model).tableName}"."${
              getEntityByModel(model).columnNames[index]
            }"`
          : null
      )
      .filter((x: string | null) => x != null)
      .map((x: string | null, i: number) => `${x} = $${i + 1}`)
      .join(' AND ');
    const values = getEntityByModel(model)
      .propertyNames.map((property: string) =>
        model[property as keyof typeof model] != null
          ? model[property as keyof typeof model]
          : null
      )
      .filter((x: any) => x != null);
    return { whereClause, values };
  };

  // This one returns an object, which allows it to be more versatile.
  // To-do: make this one even better and use it instead of the one above.
  const getMatchingPartsObject = (model: IModel) => {
    const whereClause = getEntityByModel(model)
      .propertyNames.map((property: string, index: number) =>
        model[property as keyof typeof model] != null
          ? `"${getEntityByModel(model).tableName}"."${
              getEntityByModel(model).columnNames[index]
            }"`
          : null
      )
      .filter((x: string | null) => x != null)
      .map((x: string | null, i: number) => `${x} = $(${i + 1})`)
      .join(' AND ');
    const values = getEntityByModel(model)
      .propertyNames.map((property: string) =>
        model[property as keyof typeof model] != null
          ? model[property as keyof typeof model]
          : null
      )
      .filter((x: any) => x != null)
      .reduce(
        (accum: any, val: any, index: number) =>
          Object.assign({}, accum, { [index + 1]: val }),
        {}
      );
    return { whereClause, values };
  };

  const getNewWith = (model: IModel, sqlColumns: any, values: any) => {
    const Constructor = model.constructor as any;
    const modelKeys = sqlColumns.map(
      (key: string) =>
        getEntityByModel(model).propertyNames[
          getEntityByModel(model).columnNames.indexOf(key)
        ]
    );
    const modelData = modelKeys.reduce(
      (data: any, key: string, index: number) => {
        data[key] = values[index];
        return data;
      },
      {}
    );
    return new Constructor(modelData);
  };

  const getValueBySqlColumn = (model: IModel, sqlColumn: string) => {
    return model[
      getEntityByModel(model).propertyNames[
        getEntityByModel(model).columnNames.indexOf(sqlColumn)
      ] as keyof typeof model
    ];
  };
  /* ------------------------------------------------------------------------*/
  /* Query functions --------------------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  const one = <T extends IModel>(
    query: string,
    values?: object,
    errorHandler = defaultErrorHandler
  ): T => {
    return db
      .many(query, values)
      .then((rows: any) => createOneFromDatabase(rows))
      .catch(errorHandler);
  };

  const oneOrNone = <T extends IModel>(
    query: string,
    values?: object,
    errorHandler = defaultErrorHandler
  ): T | void => {
    return db
      .any(query, values)
      .then((rows: any) => createOneOrNoneFromDatabase(rows))
      .catch(errorHandler);
  };

  const many = <T extends ICollection<IModel>>(
    query: string,
    values?: object,
    errorHandler = defaultErrorHandler
  ): T => {
    return db
      .any(query, values)
      .then((rows: any) => createManyFromDatabase(rows))
      .catch(errorHandler);
  };

  const any = <T extends ICollection<IModel>>(
    query: string,
    values?: object,
    errorHandler = defaultErrorHandler
  ): T | void => {
    return db
      .any(query, values)
      .then((rows: any) => createFromDatabase(rows))
      .catch(errorHandler);
  };

  const none = (
    query: string,
    values?: object,
    errorHandler = defaultErrorHandler
  ): void => {
    return db
      .none(query, values)
      .then(() => null)
      .catch(errorHandler);
  };

  /* ------------------------------------------------------------------------*/
  /* Built-in basic CRUD functions ------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  // Standard create
  const create = <T extends IModel>(model: T): T => {
    const { columns, values, valuesVar } = getSqlInsertParts(model);
    const query = `
      INSERT INTO "${getEntityByModel(model).tableName}" ( ${columns} )
      VALUES ( ${valuesVar} )
      RETURNING ${getEntityByModel(model).selectColumnsClause};
    `;
    return one<T>(query, values);
  };

  // Standard update
  const update = <T extends IModel>(model: T, { on = 'id' } = {}): T => {
    const { clause, idVar, values } = getSqlUpdateParts(model, on);
    const query = `
      UPDATE "${getEntityByModel(model).tableName}"
      SET ${clause}
      WHERE "${getEntityByModel(model).tableName}".${on} = ${idVar}
      RETURNING ${getEntityByModel(model).selectColumnsClause};
    `;
    return one<T>(query, values);
  };

  // Standard delete
  const _delete = <T extends IModel>(model: T): void => {
    const id = (model as any).id;
    const query = `
      DELETE FROM "${getEntityByModel(model).tableName}"
      WHERE "${getEntityByModel(model).tableName}".id = $(id)
    `;
    return none(query, { id });
  };

  const deleteMatching = <T extends IModel>(model: T) => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      DELETE FROM "${getEntityByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return none(query, values);
  };

  const getMatching = <T extends IModel>(model: T): T => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${getEntityByModel(model).selectColumnsClause}
      FROM "${getEntityByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return one<T>(query, values);
  };

  const getOneOrNoneMatching = <T extends IModel>(model: T): T | void => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${getEntityByModel(model).selectColumnsClause}
      FROM "${getEntityByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return oneOrNone<T>(query, values);
  };

  const getAnyMatching = <T extends ICollection<IModel>>(
    model: IModel
  ): T | void => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${getEntityByModel(model).selectColumnsClause}
      FROM "${getEntityByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return any<T>(query, values);
  };

  const getAllMatching = <T extends ICollection<IModel>>(model: IModel): T => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${getEntityByModel(model).selectColumnsClause}
      FROM "${getEntityByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return many<T>(query, values);
  };

  return {
    // Query Helper Function
    nestClump,
    clumpIntoGroups,
    mapToBos,
    objectifyDatabaseResult,
    createFromDatabase,
    createOneFromDatabase,
    createOneOrNoneFromDatabase,
    createManyFromDatabase,
    getSqlInsertParts,
    getSqlUpdateParts,
    getMatchingParts,
    getMatchingPartsObject,
    getNewWith,
    getValueBySqlColumn,
    // Query Functions
    one,
    oneOrNone,
    many,
    any,
    none,
    // Built-in basic CRUD functions
    create,
    update,
    delete: _delete,
    deleteMatching,
    getMatching,
    getOneOrNoneMatching,
    getAnyMatching,
    getAllMatching,
    // tables property for access to select columns clause string
    tables: entities.reduce((accum: any, data: IEntityInternal<IModel>) => {
      accum[data.displayName] = {
        columns: data.selectColumnsClause
      };
      return accum;
    }, {}),
    // provide direct access to db
    db
  };
};
