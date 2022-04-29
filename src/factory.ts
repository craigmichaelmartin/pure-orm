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
}
export type IPureORMInternalDataArray<T> = Array<IPureORMInternalData<T>>;


export const getPrimaryKey = (data: IPureORMInternalData<any>): Array<string> => {
  const pkColumnsData = data.columns.filter((x: IColumnInternal) => x.primaryKey);
  const primaryKeys = pkColumnsData.map((x: IColumnInternal) => x.column);
  return primaryKeys.length > 0 ? primaryKeys : ['id'];
};

export const getColumnNames = (data: IPureORMInternalData<any>): Array<string> => {
  return data.columns.map((x: IColumnInternal): string => x.column);
};

export const getReferences = (data: IPureORMInternalData<any>): object => {
  return data.columns
    .filter((x: IColumnInternal) => x.references)
    .reduce(
      (accum: any, item: IColumnInternal) =>
        Object.assign({}, accum, {
          [item.property]: item.references
        }),
      {}
    );
};

export const getPrefixedColumnNames = (data: IPureORMInternalData<any>): Array<string> => {
  return getColumnNames(data).map((col: string) => `${data.tableName}#${col}`);
};

export const getSelectColumnsClause = (data: IPureORMInternalData<any>): string => {
  return getPrefixedColumnNames(data)
    .map(
      (prefixed: string, index: number) =>
        `"${data.tableName}".${getColumnNames(data)[index]} as "${prefixed}"`
    )
    .join(', ');
};

export const getPureORMDataByTableName = (
  tableName: string,
  pureORMDataArray: IPureORMInternalDataArray<any>
): IPureORMInternalData<any> => {
  const pureORMData = pureORMDataArray.find(data => data.tableName == tableName);
  if (!pureORMData) {
    throw new Error(`Could not find pureORMData for table ${tableName}`);
  }
  return pureORMData;
};

export const getPureORMDataByEntity = (
  entity: IEntity,
  pureORMDataArray: IPureORMInternalDataArray<any>
): IPureORMInternalData<any> => {
  const pureORMData = pureORMDataArray.find(data => data.entityClass == entity.constructor);
  if (!pureORMData) {
    throw new Error(`Could not find pureORMData for class ${entity.constructor}`);
  }
  return pureORMData;
};

export const getDisplayNameForEntity = (
  entity: IEntity,
  pureORMDataArray: IPureORMInternalDataArray<any>
): string => {
  const pureORMData = getPureORMDataByEntity(entity, pureORMDataArray);
  return pureORMData.displayName;
};

export const getSelectColumnsClauseForEntity = (
  entity: IEntity,
  pureORMDataArray: IPureORMInternalDataArray<any>
): string => {
  const pureORMData = getPureORMDataByEntity(entity, pureORMDataArray);
  return getSelectColumnsClause(pureORMData);
};

export const getPropertyNamesForEntity = (
  entity: IEntity,
  pureORMDataArray: IPureORMInternalDataArray<any>
): Array<string> => {
  const pureORMData = getPureORMDataByEntity(entity, pureORMDataArray);
  return pureORMData.propertyNames;
};

export const getColumnNamesForEntity = (
  entity: IEntity,
  pureORMDataArray: IPureORMInternalDataArray<any>
): Array<string> => {
  const pureORMData = getPureORMDataByEntity(entity, pureORMDataArray);
  return getColumnNames(pureORMData);
};

export const getPrimaryKeyForEntity = (
  entity: IEntity,
  pureORMDataArray: IPureORMInternalDataArray<any>
): Array<string> => {
  const pureORMData = getPureORMDataByEntity(entity, pureORMDataArray);
  return getPrimaryKey(pureORMData);
};

export const getTableNameForEntity = (
  entity: IEntity,
  pureORMDataArray: IPureORMInternalDataArray<any>
): string => {
  const pureORMData = getPureORMDataByEntity(entity, pureORMDataArray);
  return pureORMData.tableName;
};

export const getReferencesForEntity = (
  entity: IEntity,
  pureORMDataArray: IPureORMInternalDataArray<any>
): object => {
  const pureORMData = getPureORMDataByEntity(entity, pureORMDataArray);
  return getReferences(pureORMData);
};

export const getCollectionDisplayNameForEntity = (
  entity: IEntity,
  pureORMDataArray: IPureORMInternalDataArray<any>
): string => {
  const pureORMData = getPureORMDataByEntity(entity, pureORMDataArray);
  return pureORMData.collectionDisplayName;
};

// Returns unique identifier of entity (the values of the primary keys)
export const getIdForEntity = (
  entity: IEntity,
  pureORMDataArray: IPureORMInternalDataArray<any>
): string => {
  const pureORMData = getPureORMDataByEntity(entity, pureORMDataArray);
  return getPrimaryKey(pureORMData)
    .map((key: string) => entity[key as keyof typeof entity])
    .join('');
};

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
    const entityClass = d.entityClass;
    const collectionClass = d.collectionClass;

    return {
      tableName,
      displayName,
      collectionDisplayName,
      columns,
      propertyNames,
      entityClass,
      collectionClass,
    };
  });

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
    const built = { [getDisplayNameForEntity(root, pureORMDataArray)]: root };

    let nodes = [root];

    // Wowzer is this both CPU and Memory inefficient
    clump.forEach((array: Array<IEntity>) => {
      array.forEach((_entity: IEntity) => {
        const nodeAlreadySeen = nodes.find(
          (x: IEntity) =>
            x.constructor.name === _entity.constructor.name
            && getIdForEntity(x, pureORMDataArray) === getIdForEntity(_entity, pureORMDataArray)
        );
        const entity = nodeAlreadySeen || _entity;
        const isNodeAlreadySeen = !!nodeAlreadySeen;
        const nodePointingToIt = nodes.find(node => {
          const indexes = Object.values(getReferencesForEntity(node, pureORMDataArray))
            .map((x: IEntityClass, i: number) => (x === entity.constructor ? i : null))
            .filter((x: number | null, i) => x != null) as Array<number>;
          if (!indexes.length) {
            return false;
          }
          for (const index of indexes) {
            const property = Object.keys(getReferencesForEntity(node, pureORMDataArray))[index];
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
          const index = Object.values(getReferencesForEntity(entity, pureORMDataArray)).indexOf(
            parent.constructor
          );
          if (index === -1) {
            return false;
          }
          const property = Object.keys(getReferencesForEntity(entity, pureORMDataArray))[index];
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
            const ec = entity[getCollectionDisplayNameForEntity(nodePointingToIt, pureORMDataArray) as keyof typeof entity];
            if (ec && ec.models.find((m: IEntity) => m === nodePointingToIt)) {
              nodes = [entity, ...nodes];
              return;
            }
          }
        }
        if (nodePointingToIt) {
          nodePointingToIt[getDisplayNameForEntity(entity, pureORMDataArray)] = entity;
        } else if (nodeItPointsTo) {
          let collection = nodeItPointsTo[getCollectionDisplayNameForEntity(entity, pureORMDataArray)];
          if (collection) {
            collection.models.push(entity);
          } else {
            const Collection = getPureORMDataByEntity(entity, pureORMDataArray).collectionClass;
            nodeItPointsTo[getCollectionDisplayNameForEntity(entity, pureORMDataArray)] = new Collection({
              models: [entity]
            });
          }
        } else {
          if (!getIdForEntity(entity, pureORMDataArray)) {
            // If the join is fruitless; todo: add a test for this path
            return;
          }
          throw Error(`Could not find how this BO fits: ${
            JSON.stringify(entity)
          } ${getPureORMDataByEntity(entity, pureORMDataArray).tableName}`)
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
      const id = getPrimaryKeyForEntity(root, pureORMDataArray)
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
      const pureORMData = getPureORMDataByTableName(tableName, pureORMDataArray);
      const propified = Object.keys(objectified[tableName]).reduce(
        (obj: any, column) => {
          let propertyName = pureORMData.propertyNames[getColumnNames(pureORMData).indexOf(column)];
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
    const Collection = getPureORMDataByEntity(models[0], pureORMDataArray).collectionClass;
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
    const columns = getColumnNamesForEntity(entity, pureORMDataArray)
      .filter(
        (column: string, index: number) => entity[getPropertyNamesForEntity(entity, pureORMDataArray)[index] as keyof typeof entity] !== void 0
      )
      .map((col: string) => `"${col}"`)
      .join(', ');
    const values = getPropertyNamesForEntity(entity, pureORMDataArray)
      .map((property: string) => entity[property as keyof typeof entity])
      .filter((value: any) => value !== void 0);
    const valuesVar = values.map((value: any, index: number) => `$${index + 1}`);
    return { columns, values, valuesVar };
  };

  const getSqlUpdateParts = (entity: IEntity, on = 'id') => {
    const clauseArray = getColumnNamesForEntity(entity, pureORMDataArray)
      .filter(
        (sqlColumn: string, index: number) => entity[getPropertyNamesForEntity(entity, pureORMDataArray)[index] as keyof typeof entity] !== void 0
      )
      .map((sqlColumn: string, index: number) => `"${sqlColumn}" = $${index + 1}`);
    const clause = clauseArray.join(', ');
    const idVar = `$${clauseArray.length + 1}`;
    const _values = getPropertyNamesForEntity(entity, pureORMDataArray)
      .map((property: string) => entity[property as keyof typeof entity])
      .filter((value: any) => value !== void 0);
    const values = [..._values, entity[on as keyof typeof entity]];
    return { clause, idVar, values };
  };

  const getMatchingParts = (entity: IEntity) => {
    const whereClause = getPropertyNamesForEntity(entity, pureORMDataArray)
      .map((property: string, index: number) =>
        entity[property as keyof typeof entity] != null
          ? `"${getTableNameForEntity(entity, pureORMDataArray)}"."${
              getColumnNamesForEntity(entity, pureORMDataArray)[index]
            }"`
          : null
      )
      .filter((x: string | null) => x != null)
      .map((x: string | null, i: number) => `${x} = $${i + 1}`)
      .join(' AND ');
    const values = getPropertyNamesForEntity(entity, pureORMDataArray)
      .map((property: string) => (entity[property as keyof typeof entity] != null ? entity[property as keyof typeof entity] : null))
      .filter((x: any) => x != null);
    return { whereClause, values };
  };

  // This one returns an object, which allows it to be more versatile.
  // To-do: make this one even better and use it instead of the one above.
  const getMatchingPartsObject = (entity: IEntity) => {
    const whereClause = getPropertyNamesForEntity(entity, pureORMDataArray)
      .map((property: string, index: number) =>
        entity[property as keyof typeof entity] != null
          ? `"${getTableNameForEntity(entity, pureORMDataArray)}"."${
              getColumnNamesForEntity(entity, pureORMDataArray)[index]
            }"`
          : null
      )
      .filter((x: string | null) => x != null)
      .map((x: string | null, i: number) => `${x} = $(${i + 1})`)
      .join(' AND ');
    const values = getPropertyNamesForEntity(entity, pureORMDataArray)
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
      (key: string) => getPropertyNamesForEntity(entity, pureORMDataArray)[getColumnNamesForEntity(entity, pureORMDataArray).indexOf(key)]
    );
    const entityData = entityKeys.reduce((data: any, key: string, index: number) => {
      data[key] = values[index];
      return data;
    }, {});
    return new Constructor(entityData);
  };

  const getValueBySqlColumn = (entity: IEntity, sqlColumn: string) => {
    return entity[
      getPropertyNamesForEntity(entity, pureORMDataArray)[
        getColumnNamesForEntity(entity, pureORMDataArray).indexOf(sqlColumn)
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
      INSERT INTO "${getTableNameForEntity(entity, pureORMDataArray)}" ( ${columns} )
      VALUES ( ${valuesVar} )
      RETURNING ${getSelectColumnsClauseForEntity(entity, pureORMDataArray)};
    `;
    return one(query, values) as T;
  };

  // Standard update
  const update = <T>(entity: T, { on = 'id' } = {}) => {
    const { clause, idVar, values } = getSqlUpdateParts(entity, on);
    const query = `
      UPDATE "${getTableNameForEntity(entity, pureORMDataArray)}"
      SET ${clause}
      WHERE "${getTableNameForEntity(entity, pureORMDataArray)}".${on} = ${idVar}
      RETURNING ${getSelectColumnsClauseForEntity(entity, pureORMDataArray)};
    `;
    return one(query, values) as T;
  };

  // Standard delete
  const _delete = <T>(entity: T) => {
    const id = (entity as any).id;
    const query = `
      DELETE FROM "${getTableNameForEntity(entity, pureORMDataArray)}"
      WHERE "${getTableNameForEntity(entity, pureORMDataArray)}".id = $(id)
    `;
    return none(query, { id });
  };

  const deleteMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity);
    const query = `
      DELETE FROM "${getTableNameForEntity(entity, pureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return none(query, values);
  };

  const getMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity);
    const query = `
      SELECT ${getSelectColumnsClauseForEntity(entity, pureORMDataArray)}
      FROM "${getTableNameForEntity(entity, pureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return one(query, values) as T;
  };

  const getOneOrNoneMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity);
    const query = `
      SELECT ${getSelectColumnsClauseForEntity(entity, pureORMDataArray)}
      FROM "${getTableNameForEntity(entity, pureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return oneOrNone(query, values);
  };

  const getAnyMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity);
    const query = `
      SELECT ${getSelectColumnsClauseForEntity(entity, pureORMDataArray)}
      FROM "${getTableNameForEntity(entity, pureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return any(query, values);
  };

  const getAllMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity);
    const query = `
      SELECT ${getSelectColumnsClauseForEntity(entity, pureORMDataArray)}
      FROM "${getTableNameForEntity(entity, pureORMDataArray)}"
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
      accum[data.displayName] = getSelectColumnsClause(data);
      return accum;
    }, {})
  };
};
