const camelCase = require('camelcase');

export interface IColumnData {
  column: string;
  property?: string;
  references?: IModelClass;
  primaryKey?: boolean;
}
export type IColumn = IColumnData | string;
export type IColumns = Array<IColumn>;

export interface IColumnInternalData {
  column: string;
  property: string;
  references?: IModelClass;
  primaryKey: boolean;
}
export type IColumnInternal = IColumnInternalData;
export type IColumnsInternal = Array<IColumnInternal>;

export interface IModel {
  [key:string]: any;
}
// IModel used as a type refers to an instance of IModel;
// IModelClass used as a type refers to the class itself 
export type IModelClass = (new (props: any) => IModel);
export interface ICollection<T> {
  models: Array<T>;
}
export interface IPureORMData<T> {
  tableName: string;
  displayName?: string;
  collectionDisplayName?: string;
  columns: IColumns;
  Model: (new (props: any) => T)
  Collection: (new ({models}: any) => ICollection<T>);
}
export type IPureORMDataArray<T> = Array<IPureORMData<T>>;

export interface IPureORMInternalData<T> {
  tableName: string;
  displayName: string;
  collectionDisplayName: string;
  columns: IColumnsInternal;
  propertyNames: Array<string>;
  Model: (new (props: any) => T)
  Collection: (new ({models}: any) => ICollection<T>);
  columnNames: Array<string>;
  prefixedColumnNames: Array<string>;
  primaryKeys: Array<string>;
  references: object;
  selectColumnsClause: string;
  getPkId: (model: IModel) => string;
}
export type IPureORMInternalDataArray<T> = Array<IPureORMInternalData<T>>;

export interface PureORM {
  nestClump: (clump: Array<Array<IModel>>) => object;
  clumpIntoGroups: (processed: Array<Array<IModel>>) => Array<Array<Array<IModel>>>;
  mapToBos: (objectified: any) => any;
  objectifyDatabaseResult: (result: object) => any;
  createFromDatabase: (_result: Array<object> | object) => any;
  createOneFromDatabase: (_result: any) => any;
  createOneOrNoneFromDatabase: (_result: any) => any;
  createManyFromDatabase: (_result: any) => any;
  getSqlInsertParts: (model: IModel) => any;
  getSqlUpdateParts: (model: IModel, on?: string) => any;
  getMatchingParts: (model: IModel) => any;
  getMatchingPartsObject: (model: IModel) => any;
  getNewWith: (model: IModel, sqlColumns: any, values: any) => any;
  getValueBySqlColumn: (model: IModel, sqlColumn: string) => any;
  one: <T>(query: string, params?: object) => T;
  oneOrNone: <T>(query: string, params: object) => T | void;
  many: <T>(query: string, params: object) => Array<T>;
  any: <T>(query: string, params: object) => Array<T> | void;
  none: (query: string, params: object) => void;
  getMatching: <T>(model: T) => T;
  getOneOrNoneMatching: <T>(model: T) => T | void;
  getAnyMatching: <T>(model: T) => Array<T> | void;
  getAllMatching: <T>(model: T) => Array<T>;
  create: <T>(model: T) => T;
  update: <T>(model: T) => T;
  delete: <T>(model: T) => void;
  deleteMatching: <T>(model: T) => void;
  tables: { [key:string]: { [key: string]: string; }};
}

export interface CreateOptions{
  getPureORMDataArray: () => IPureORMDataArray<any>;
  db: any;
  logError?: (err: Error) => void;
}

export const create = ({ getPureORMDataArray, db, logError }: CreateOptions): PureORM => {

  const pureORMDataArray: IPureORMInternalDataArray<any> = getPureORMDataArray().map((d: IPureORMData<any>) => {
    const tableName = d.tableName;
    const displayName = d.displayName || camelCase(d.tableName);
    const collectionDisplayName = d.collectionDisplayName || `${displayName}s`;
    const columns = d.columns.map((d: IColumn) => {
      if (typeof d === 'string') {
        return {
          column: d,
          property: camelCase(d),
          primaryKey: false,
        };
      }
      return {
        column: d.column,
        property: d.property || camelCase(d.column),
        primaryKey: d.primaryKey || false,
        ...(d.references ? { references: d.references } : {}),
      };
    });
    const propertyNames = columns.map((x: IColumnInternal): string => x.property);
    const columnNames = columns.map((x: IColumnInternal): string => x.column);
    const prefixedColumnNames = columnNames.map((col: string) => `${tableName}#${col}`);
    const Model = d.Model;
    const Collection = d.Collection;

    const pkColumnsData = columns.filter((x: IColumnInternal) => x.primaryKey);
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
      getPkId,
    };
  });

  const getPureORMDataByTableName = (tableName: string): IPureORMInternalData<any> => {
    const pureORMData = pureORMDataArray.find(data => data.tableName == tableName);
    if (!pureORMData) {
      throw new Error(`Could not find pureORMData for table ${tableName}`);
    }
    return pureORMData;
  };

  const getPureORMDataByModel = (model: IModel): IPureORMInternalData<any> => {
    const pureORMData = pureORMDataArray.find(data => data.Model == model.constructor);
    if (!pureORMData) {
      throw new Error(`Could not find pureORMData for class ${model.constructor}`);
    }
    return pureORMData;
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
    clump = clump.map(
      (row: Array<IModel>) => row.filter(
        (item: IModel, index: number) => index !== 0
      )
    );
    const built = { [getPureORMDataByModel(root).displayName]: root };

    let nodes = [root];

    // Wowzer is this both CPU and Memory inefficient
    clump.forEach((array: Array<IModel>) => {
      array.forEach((_model: IModel) => {
        const nodeAlreadySeen = nodes.find(
          (x: IModel) =>
            x.constructor.name === _model.constructor.name
            && getPureORMDataByModel(x).getPkId(x) === getPureORMDataByModel(_model).getPkId(_model)
        );
        const model = nodeAlreadySeen || _model;
        const isNodeAlreadySeen = !!nodeAlreadySeen;
        const nodePointingToIt = nodes.find(node => {
          const indexes = Object.values(getPureORMDataByModel(node).references)
            .map((x: IModelClass, i: number) => (x === model.constructor ? i : null))
            .filter((x: number | null, i) => x != null) as Array<number>;
          if (!indexes.length) {
            return false;
          }
          for (const index of indexes) {
            const property = Object.keys(getPureORMDataByModel(node).references)[index];
            if (node[property] === model.id) {
              return true;
            }
          }
          return false;
        });
        // For first obj type which is has an instance in nodes array,
        // get its index in nodes array
        const indexOfOldestParent = array.reduce((answer: number | null, obj: IModel) => {
          if (answer != null) {
            return answer;
          }
          const index = nodes.findIndex(n => n.constructor === obj.constructor);
          if (index !== -1) {
            return index;
          }
          return null;
        }, null) || 0;
        const parentHeirarchy = [
          root,
          ...nodes.slice(0, indexOfOldestParent + 1).reverse()
        ];
        const nodeItPointsTo = parentHeirarchy.find(parent => {
          const index = Object.values(getPureORMDataByModel(model).references).indexOf(
            parent.constructor
          );
          if (index === -1) {
            return false;
          }
          const property = Object.keys(getPureORMDataByModel(model).references)[index];
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
            const ec = model[getPureORMDataByModel(nodePointingToIt).collectionDisplayName as keyof typeof model];
            if (ec && ec.models.find((m: IModel) => m === nodePointingToIt)) {
              nodes = [model, ...nodes];
              return;
            }
          }
        }
        if (nodePointingToIt) {
          nodePointingToIt[getPureORMDataByModel(model).displayName] = model;
        } else if (nodeItPointsTo) {
          let collection = nodeItPointsTo[getPureORMDataByModel(model).collectionDisplayName];
          if (collection) {
            collection.models.push(model);
          } else {
            const Collection = getPureORMDataByModel(model).Collection;
            nodeItPointsTo[getPureORMDataByModel(model).collectionDisplayName] = new Collection({
              models: [model]
            });
          }
        } else {
          if (!getPureORMDataByModel(model).getPkId(model)) {
            // If the join is fruitless; todo: add a test for this path
            return;
          }
          throw Error(`Could not find how this BO fits: ${
            JSON.stringify(model)
          } ${getPureORMDataByModel(model).tableName}`)
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
  const clumpIntoGroups = (processed: Array<Array<IModel>>): Array<Array<Array<IModel>>> => {
    const root = processed[0][0];
    const rootBo = root.constructor;
    const clumps = processed.reduce((accum: any, item: Array<IModel>) => {
      const id = getPureORMDataByModel(root).primaryKeys
        .map((key: string) => item.find((x: IModel) => x.constructor === rootBo)?.[key])
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
    return Object.keys(objectified).map(tableName => {
      const pureORMData = getPureORMDataByTableName(tableName);
      const propified = Object.keys(objectified[tableName]).reduce(
        (obj: any, column) => {
          let propertyName = pureORMData.propertyNames[pureORMData.columnNames.indexOf(column)];
          if (!propertyName) {
            if (column.startsWith('meta_')) {
              propertyName = camelCase(column);
            } else {
              throw Error(
                `No property name for "${column}" in business object "${
                  pureORMData.displayName
                }". Non-spec'd columns must begin with "meta_".`
              );
            }
          }
          obj[propertyName] = objectified[tableName][column];
          return obj;
        },
        {}
      );
      return new pureORMData.Model(propified);
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

  const createFromDatabase = (_result: Array<object> | object) => {
    const result = Array.isArray(_result) ? _result : [_result];
    const objectified = result.map(objectifyDatabaseResult);
    const boified = objectified.map(mapToBos);
    const clumps = clumpIntoGroups(boified);
    const nested = clumps.map(nestClump);
    const models = nested.map(n => Object.values(n)[0]);
    const Collection = getPureORMDataByModel(models[0]).Collection;
    return models.length ? new Collection({ models }) : void 0;
  };

  const createOneFromDatabase = (_result: any) => {
    const collection = createFromDatabase(_result);
    if (!collection || collection.models.length === 0) {
      throw Error('Did not get one.');
    } else if (collection.models.length > 1) {
      throw Error('Got more than one.');
    }
    return collection.models[0];
  };

  const createOneOrNoneFromDatabase = (_result: any) => {
    if (!_result) {
      return _result;
    }
    const collection = createFromDatabase(_result);
    if (collection && collection.models.length > 1) {
      throw Error('Got more than one.');
    }
    return collection && collection.models[0];
  };

  const createManyFromDatabase = (_result: any) => {
    const collection = createFromDatabase(_result);
    if (!collection || collection.models.length === 0) {
      throw Error('Did not get at least one.');
    }
    return collection;
  };

  const getSqlInsertParts = (model: IModel) => {
    const columns = getPureORMDataByModel(model).columnNames
      .filter(
        (column: string, index: number) => model[getPureORMDataByModel(model).propertyNames[index] as keyof typeof model] !== void 0
      )
      .map((col: string) => `"${col}"`)
      .join(', ');
    const values = getPureORMDataByModel(model).propertyNames
      .map((property: string) => model[property as keyof typeof model])
      .filter((value: any) => value !== void 0);
    const valuesVar = values.map((value: any, index: number) => `$${index + 1}`);
    return { columns, values, valuesVar };
  };

  const getSqlUpdateParts = (model: IModel, on = 'id') => {
    const clauseArray = getPureORMDataByModel(model).columnNames
      .filter(
        (sqlColumn: string, index: number) => model[getPureORMDataByModel(model).propertyNames[index] as keyof typeof model] !== void 0
      )
      .map((sqlColumn: string, index: number) => `"${sqlColumn}" = $${index + 1}`);
    const clause = clauseArray.join(', ');
    const idVar = `$${clauseArray.length + 1}`;
    const _values = getPureORMDataByModel(model).propertyNames
      .map((property: string) => model[property as keyof typeof model])
      .filter((value: any) => value !== void 0);
    const values = [..._values, model[on as keyof typeof model]];
    return { clause, idVar, values };
  };

  const getMatchingParts = (model: IModel) => {
    const whereClause = getPureORMDataByModel(model).propertyNames
      .map((property: string, index: number) =>
        model[property as keyof typeof model] != null
          ? `"${getPureORMDataByModel(model).tableName}"."${
              getPureORMDataByModel(model).columnNames[index]
            }"`
          : null
      )
      .filter((x: string | null) => x != null)
      .map((x: string | null, i: number) => `${x} = $${i + 1}`)
      .join(' AND ');
    const values = getPureORMDataByModel(model).propertyNames
      .map((property: string) => (model[property as keyof typeof model] != null ? model[property as keyof typeof model] : null))
      .filter((x: any) => x != null);
    return { whereClause, values };
  };

  // This one returns an object, which allows it to be more versatile.
  // To-do: make this one even better and use it instead of the one above.
  const getMatchingPartsObject = (model: IModel) => {
    const whereClause = getPureORMDataByModel(model).propertyNames
      .map((property: string, index: number) =>
        model[property as keyof typeof model] != null
          ? `"${getPureORMDataByModel(model).tableName}"."${
              getPureORMDataByModel(model).columnNames[index]
            }"`
          : null
      )
      .filter((x: string | null) => x != null)
      .map((x: string | null, i: number) => `${x} = $(${i + 1})`)
      .join(' AND ');
    const values = getPureORMDataByModel(model).propertyNames
      .map((property: string) => (model[property as keyof typeof model] != null ? model[property as keyof typeof model] : null))
      .filter((x: any) => x != null)
      .reduce(
        (accum: any, val: any, index: number) => Object.assign({}, accum, { [index + 1]: val }),
        {}
      );
    return { whereClause, values };
  };

  const getNewWith = (model: IModel, sqlColumns: any, values: any) => {
    const Constructor = model.constructor as any;
    const modelKeys = sqlColumns.map(
      (key: string) => getPureORMDataByModel(model).propertyNames[
        getPureORMDataByModel(model).columnNames.indexOf(key)
      ]
    );
    const modelData = modelKeys.reduce((data: any, key: string, index: number) => {
      data[key] = values[index];
      return data;
    }, {});
    return new Constructor(modelData);
  };

  const getValueBySqlColumn = (model: IModel, sqlColumn: string) => {
    return model[
      getPureORMDataByModel(model).propertyNames[
        getPureORMDataByModel(model).columnNames.indexOf(sqlColumn)
      ] as keyof typeof model
    ];
  };
  /* ------------------------------------------------------------------------*/
  /* Query functions --------------------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  const one = <T>(query: string, values?: object, errorHandler = defaultErrorHandler): T => {
    return db
      .many(query, values)
      .then((rows: any) => createOneFromDatabase(rows))
      .catch(errorHandler);
  };

  const oneOrNone = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createOneOrNoneFromDatabase(rows))
      .catch(errorHandler);
  };

  const many = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createManyFromDatabase(rows))
      .catch(errorHandler);
  };

  const any = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createFromDatabase(rows))
      .catch(errorHandler);
  };

  const none = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .none(query, values)
      .then(() => null)
      .catch(errorHandler);
  };

  /* ------------------------------------------------------------------------*/
  /* Built-in basic CRUD functions ------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  // Standard create
  const create = <T>(model: T) => {
    const { columns, values, valuesVar } = getSqlInsertParts(model);
    const query = `
      INSERT INTO "${getPureORMDataByModel(model).tableName}" ( ${columns} )
      VALUES ( ${valuesVar} )
      RETURNING ${getPureORMDataByModel(model).selectColumnsClause};
    `;
    return one(query, values) as T;
  };

  // Standard update
  const update = <T>(model: T, { on = 'id' } = {}) => {
    const { clause, idVar, values } = getSqlUpdateParts(model, on);
    const query = `
      UPDATE "${getPureORMDataByModel(model).tableName}"
      SET ${clause}
      WHERE "${getPureORMDataByModel(model).tableName}".${on} = ${idVar}
      RETURNING ${getPureORMDataByModel(model).selectColumnsClause};
    `;
    return one(query, values) as T;
  };

  // Standard delete
  const _delete = <T>(model: T) => {
    const id = (model as any).id;
    const query = `
      DELETE FROM "${getPureORMDataByModel(model).tableName}"
      WHERE "${getPureORMDataByModel(model).tableName}".id = $(id)
    `;
    return none(query, { id });
  };

  const deleteMatching = <T>(model: T) => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      DELETE FROM "${getPureORMDataByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return none(query, values);
  };

  const getMatching = <T>(model: T) => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${getPureORMDataByModel(model).selectColumnsClause}
      FROM "${getPureORMDataByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return one(query, values) as T;
  };

  const getOneOrNoneMatching = <T>(model: T) => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${getPureORMDataByModel(model).selectColumnsClause}
      FROM "${getPureORMDataByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return oneOrNone(query, values);
  };

  const getAnyMatching = <T>(model: T) => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${getPureORMDataByModel(model).selectColumnsClause}
      FROM "${getPureORMDataByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return any(query, values);
  };

  const getAllMatching = <T>(model: T) => {
    const { whereClause, values } = getMatchingParts(model);
    const query = `
      SELECT ${getPureORMDataByModel(model).selectColumnsClause}
      FROM "${getPureORMDataByModel(model).tableName}"
      WHERE ${whereClause};
    `;
    return many(query, values);
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
    tables: pureORMDataArray.reduce((accum: any, data: IPureORMInternalData<any>) => {
      accum[data.displayName] = data.selectColumnsClause;
      return accum;
    }, {})
  };
};
