const camelCase = require('camelcase');

export interface IColumnData {
  column: string;
  property?: string;
  references?: IEntityClass;
  primaryKey?: boolean;
}
export type IColumn = IColumnData | string;
export type IColumns = Array<IColumn>;

export interface IColumnInternalData {
  column: string;
  property: string;
  references?: IEntityClass;
  primaryKey: boolean;
}
export type IColumnInternal = IColumnInternalData;
export type IColumnsInternal = Array<IColumnInternal>;

export interface IEntity {
  [key:string]: any;
}
// IEntity used as a type refers to an instance of IEntity;
// IEntityClass used as a type refers to the class itself 
export type IEntityClass = (new (props: any) => IEntity);
export interface ICollection<T> {
  models: Array<T>;
}
export interface IPureORMData<T> {
  tableName: string;
  displayName?: string;
  collectionDisplayName?: string;
  columns: IColumns;
  entityClass: (new (props: any) => T)
  collectionClass: (new ({models}: any) => ICollection<T>);
}
export type IPureORMDataArray<T> = Array<IPureORMData<T>>;

export interface IPureORMInternalData<T> {
  tableName: string;
  displayName: string;
  collectionDisplayName: string;
  columns: IColumnsInternal;
  propertyNames: Array<string>;
  entityClass: (new (props: any) => T)
  collectionClass: (new ({models}: any) => ICollection<T>);
  columnNames: Array<string>;
  prefixedColumnNames: Array<string>;
  primaryKeys: Array<string>;
  references: object;
  selectColumnsClause: string;
  getPkId: (entity: IEntity) => string;
}
export type IPureORMInternalDataArray<T> = Array<IPureORMInternalData<T>>;

export interface PureORM {
  nestClump: (clump: Array<Array<IEntity>>) => object;
  clumpIntoGroups: (processed: Array<Array<IEntity>>) => Array<Array<Array<IEntity>>>;
  mapToBos: (objectified: any) => any;
  objectifyDatabaseResult: (result: object) => any;
  createFromDatabase: (_result: Array<object> | object) => any;
  createOneFromDatabase: (_result: any) => any;
  createOneOrNoneFromDatabase: (_result: any) => any;
  createManyFromDatabase: (_result: any) => any;
  getSqlInsertParts: (entity: IEntity) => any;
  getSqlUpdateParts: (entity: IEntity, on?: string) => any;
  getMatchingParts: (entity: IEntity) => any;
  getMatchingPartsObject: (entity: IEntity) => any;
  getNewWith: (entity: IEntity, sqlColumns: any, values: any) => any;
  getValueBySqlColumn: (entity: IEntity, sqlColumn: string) => any;
  one: <T>(query: string, params?: object) => T;
  oneOrNone: <T>(query: string, params: object) => T | void;
  many: <T>(query: string, params: object) => Array<T>;
  any: <T>(query: string, params: object) => Array<T> | void;
  none: (query: string, params: object) => void;
  getMatching: <T>(entity: T) => T;
  getOneOrNoneMatching: <T>(entity: T) => T | void;
  getAnyMatching: <T>(entity: T) => Array<T> | void;
  getAllMatching: <T>(entity: T) => Array<T>;
  create: <T>(entity: T) => T;
  update: <T>(entity: T) => T;
  delete: <T>(entity: T) => void;
  deleteMatching: <T>(entity: T) => void;
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
    const entityClass = d.entityClass;
    const collectionClass = d.collectionClass;

    const pkColumnsData = columns.filter((x: IColumnInternal) => x.primaryKey);
    const _primaryKeys = pkColumnsData.map((x: IColumnInternal) => x.column);
    const primaryKeys = _primaryKeys.length > 0 ? _primaryKeys : ['id'];

    // Returns unique identifier of entity (the values of the primary keys)
    const getPkId = (entity: IEntity): string => {
      return primaryKeys
        .map((key: string) => entity[key as keyof typeof entity])
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
      entityClass,
      collectionClass,
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

  const getPureORMDataByEntity = (entity: IEntity): IPureORMInternalData<any> => {
    const pureORMData = pureORMDataArray.find(data => data.entityClass == entity.constructor);
    if (!pureORMData) {
      throw new Error(`Could not find pureORMData for class ${entity.constructor}`);
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
  const nestClump = (clump: Array<Array<IEntity>>): object => {
    clump = clump.map((x: Array<IEntity>) => Object.values(x));
    const root = clump[0][0];
    clump = clump.map(
      (row: Array<IEntity>) => row.filter(
        (item: IEntity, index: number) => index !== 0
      )
    );
    const built = { [getPureORMDataByEntity(root).displayName]: root };

    let nodes = [root];

    // Wowzer is this both CPU and Memory inefficient
    clump.forEach((array: Array<IEntity>) => {
      array.forEach((_entity: IEntity) => {
        const nodeAlreadySeen = nodes.find(
          (x: IEntity) =>
            x.constructor.name === _entity.constructor.name
            && getPureORMDataByEntity(x).getPkId(x) === getPureORMDataByEntity(_entity).getPkId(_entity)
        );
        const entity = nodeAlreadySeen || _entity;
        const isNodeAlreadySeen = !!nodeAlreadySeen;
        const nodePointingToIt = nodes.find(node => {
          const indexes = Object.values(getPureORMDataByEntity(node).references)
            .map((x: IEntityClass, i: number) => (x === entity.constructor ? i : null))
            .filter((x: number | null, i) => x != null) as Array<number>;
          if (!indexes.length) {
            return false;
          }
          for (const index of indexes) {
            const property = Object.keys(getPureORMDataByEntity(node).references)[index];
            if (node[property] === entity.id) {
              return true;
            }
          }
          return false;
        });
        // For first obj type which is has an instance in nodes array,
        // get its index in nodes array
        const indexOfOldestParent = array.reduce((answer: number | null, obj: IEntity) => {
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
          const index = Object.values(getPureORMDataByEntity(entity).references).indexOf(
            parent.constructor
          );
          if (index === -1) {
            return false;
          }
          const property = Object.keys(getPureORMDataByEntity(entity).references)[index];
          return entity[property as keyof typeof entity] === parent.id;
        });
        if (isNodeAlreadySeen) {
          if (nodeItPointsTo && !nodePointingToIt) {
            nodes = [entity, ...nodes];
            return;
          }
          // If the nodePointingToIt (eg, parcel_event) is part of an
          // existing collection on this node (eg, parcel) which is a
          // nodeAlreadySeen, early return so we don't create it (parcel) on
          // the nodePointingToIt (parcel_event), since it (parcel) has been
          // shown to be the parent (of parcel_events).
          if (nodePointingToIt) {
            const ec = entity[getPureORMDataByEntity(nodePointingToIt).collectionDisplayName as keyof typeof entity];
            if (ec && ec.models.find((m: IEntity) => m === nodePointingToIt)) {
              nodes = [entity, ...nodes];
              return;
            }
          }
        }
        if (nodePointingToIt) {
          nodePointingToIt[getPureORMDataByEntity(entity).displayName] = entity;
        } else if (nodeItPointsTo) {
          let collection = nodeItPointsTo[getPureORMDataByEntity(entity).collectionDisplayName];
          if (collection) {
            collection.models.push(entity);
          } else {
            const Collection = getPureORMDataByEntity(entity).collectionClass;
            nodeItPointsTo[getPureORMDataByEntity(entity).collectionDisplayName] = new Collection({
              models: [entity]
            });
          }
        } else {
          if (!getPureORMDataByEntity(entity).getPkId(entity)) {
            // If the join is fruitless; todo: add a test for this path
            return;
          }
          throw Error(`Could not find how this BO fits: ${
            JSON.stringify(entity)
          } ${getPureORMDataByEntity(entity).tableName}`)
        }
        nodes = [entity, ...nodes];
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
  const clumpIntoGroups = (processed: Array<Array<IEntity>>): Array<Array<Array<IEntity>>> => {
    const root = processed[0][0];
    const rootBo = root.constructor;
    const clumps = processed.reduce((accum: any, item: Array<IEntity>) => {
      const id = getPureORMDataByEntity(root).primaryKeys
        .map((key: string) => item.find((x: IEntity) => x.constructor === rootBo)?.[key])
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
      return new pureORMData.entityClass(propified);
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
    const Collection = getPureORMDataByEntity(models[0]).collectionClass;
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

  const getSqlInsertParts = (entity: IEntity) => {
    const columns = getPureORMDataByEntity(entity).columnNames
      .filter(
        (column: string, index: number) => entity[getPureORMDataByEntity(entity).propertyNames[index] as keyof typeof entity] !== void 0
      )
      .map((col: string) => `"${col}"`)
      .join(', ');
    const values = getPureORMDataByEntity(entity).propertyNames
      .map((property: string) => entity[property as keyof typeof entity])
      .filter((value: any) => value !== void 0);
    const valuesVar = values.map((value: any, index: number) => `$${index + 1}`);
    return { columns, values, valuesVar };
  };

  const getSqlUpdateParts = (entity: IEntity, on = 'id') => {
    const clauseArray = getPureORMDataByEntity(entity).columnNames
      .filter(
        (sqlColumn: string, index: number) => entity[getPureORMDataByEntity(entity).propertyNames[index] as keyof typeof entity] !== void 0
      )
      .map((sqlColumn: string, index: number) => `"${sqlColumn}" = $${index + 1}`);
    const clause = clauseArray.join(', ');
    const idVar = `$${clauseArray.length + 1}`;
    const _values = getPureORMDataByEntity(entity).propertyNames
      .map((property: string) => entity[property as keyof typeof entity])
      .filter((value: any) => value !== void 0);
    const values = [..._values, entity[on as keyof typeof entity]];
    return { clause, idVar, values };
  };

  const getMatchingParts = (entity: IEntity) => {
    const whereClause = getPureORMDataByEntity(entity).propertyNames
      .map((property: string, index: number) =>
        entity[property as keyof typeof entity] != null
          ? `"${getPureORMDataByEntity(entity).tableName}"."${
              getPureORMDataByEntity(entity).columnNames[index]
            }"`
          : null
      )
      .filter((x: string | null) => x != null)
      .map((x: string | null, i: number) => `${x} = $${i + 1}`)
      .join(' AND ');
    const values = getPureORMDataByEntity(entity).propertyNames
      .map((property: string) => (entity[property as keyof typeof entity] != null ? entity[property as keyof typeof entity] : null))
      .filter((x: any) => x != null);
    return { whereClause, values };
  };

  // This one returns an object, which allows it to be more versatile.
  // To-do: make this one even better and use it instead of the one above.
  const getMatchingPartsObject = (entity: IEntity) => {
    const whereClause = getPureORMDataByEntity(entity).propertyNames
      .map((property: string, index: number) =>
        entity[property as keyof typeof entity] != null
          ? `"${getPureORMDataByEntity(entity).tableName}"."${
              getPureORMDataByEntity(entity).columnNames[index]
            }"`
          : null
      )
      .filter((x: string | null) => x != null)
      .map((x: string | null, i: number) => `${x} = $(${i + 1})`)
      .join(' AND ');
    const values = getPureORMDataByEntity(entity).propertyNames
      .map((property: string) => (entity[property as keyof typeof entity] != null ? entity[property as keyof typeof entity] : null))
      .filter((x: any) => x != null)
      .reduce(
        (accum: any, val: any, index: number) => Object.assign({}, accum, { [index + 1]: val }),
        {}
      );
    return { whereClause, values };
  };

  const getNewWith = (entity: IEntity, sqlColumns: any, values: any) => {
    const Constructor = entity.constructor as any;
    const entityKeys = sqlColumns.map(
      (key: string) => getPureORMDataByEntity(entity).propertyNames[
        getPureORMDataByEntity(entity).columnNames.indexOf(key)
      ]
    );
    const entityData = entityKeys.reduce((data: any, key: string, index: number) => {
      data[key] = values[index];
      return data;
    }, {});
    return new Constructor(entityData);
  };

  const getValueBySqlColumn = (entity: IEntity, sqlColumn: string) => {
    return entity[
      getPureORMDataByEntity(entity).propertyNames[
        getPureORMDataByEntity(entity).columnNames.indexOf(sqlColumn)
      ] as keyof typeof entity
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
  const create = <T>(entity: T) => {
    const { columns, values, valuesVar } = getSqlInsertParts(entity);
    const query = `
      INSERT INTO "${getPureORMDataByEntity(entity).tableName}" ( ${columns} )
      VALUES ( ${valuesVar} )
      RETURNING ${getPureORMDataByEntity(entity).selectColumnsClause};
    `;
    return one(query, values) as T;
  };

  // Standard update
  const update = <T>(entity: T, { on = 'id' } = {}) => {
    const { clause, idVar, values } = getSqlUpdateParts(entity, on);
    const query = `
      UPDATE "${getPureORMDataByEntity(entity).tableName}"
      SET ${clause}
      WHERE "${getPureORMDataByEntity(entity).tableName}".${on} = ${idVar}
      RETURNING ${getPureORMDataByEntity(entity).selectColumnsClause};
    `;
    return one(query, values) as T;
  };

  // Standard delete
  const _delete = <T>(entity: T) => {
    const id = (entity as any).id;
    const query = `
      DELETE FROM "${getPureORMDataByEntity(entity).tableName}"
      WHERE "${getPureORMDataByEntity(entity).tableName}".id = $(id)
    `;
    return none(query, { id });
  };

  const deleteMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity);
    const query = `
      DELETE FROM "${getPureORMDataByEntity(entity).tableName}"
      WHERE ${whereClause};
    `;
    return none(query, values);
  };

  const getMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity);
    const query = `
      SELECT ${getPureORMDataByEntity(entity).selectColumnsClause}
      FROM "${getPureORMDataByEntity(entity).tableName}"
      WHERE ${whereClause};
    `;
    return one(query, values) as T;
  };

  const getOneOrNoneMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity);
    const query = `
      SELECT ${getPureORMDataByEntity(entity).selectColumnsClause}
      FROM "${getPureORMDataByEntity(entity).tableName}"
      WHERE ${whereClause};
    `;
    return oneOrNone(query, values);
  };

  const getAnyMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity);
    const query = `
      SELECT ${getPureORMDataByEntity(entity).selectColumnsClause}
      FROM "${getPureORMDataByEntity(entity).tableName}"
      WHERE ${whereClause};
    `;
    return any(query, values);
  };

  const getAllMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity);
    const query = `
      SELECT ${getPureORMDataByEntity(entity).selectColumnsClause}
      FROM "${getPureORMDataByEntity(entity).tableName}"
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
