const camelCase = require('camelcase');

import {
  createOneFromDatabase,
  createOneOrNoneFromDatabase,
  createManyFromDatabase,
  createFromDatabase,
  getSqlUpdateParts,
  getSqlInsertParts,
  getTableNameForEntity,
  getMatchingParts,
  getSelectColumnsClause,
  getSelectColumnsClauseForEntity,
  IPureORMData,
  IPureORMDataArray,
  IPureORMInternalData,
  IPureORMInternalDataArray,
  IColumn,
  IColumnInternal,
} from './business-object';

export interface PureORM {
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

  /* ------------------------------------------------------------------------*/
  /* Query functions --------------------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  const one = <T>(query: string, values?: object, errorHandler = defaultErrorHandler): T => {
    return db
      .many(query, values)
      .then((rows: any) => createOneFromDatabase(rows, pureORMDataArray))
      .catch(errorHandler);
  };

  const oneOrNone = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createOneOrNoneFromDatabase(rows, pureORMDataArray))
      .catch(errorHandler);
  };

  const many = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createManyFromDatabase(rows, pureORMDataArray))
      .catch(errorHandler);
  };

  const any = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createFromDatabase(rows, pureORMDataArray))
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
    const { columns, values, valuesVar } = getSqlInsertParts(entity, pureORMDataArray);
    const query = `
      INSERT INTO "${getTableNameForEntity(entity, pureORMDataArray)}" ( ${columns} )
      VALUES ( ${valuesVar} )
      RETURNING ${getSelectColumnsClauseForEntity(entity, pureORMDataArray)};
    `;
    return one(query, values) as T;
  };

  // Standard update
  const update = <T>(entity: T, { on = 'id' } = {}) => {
    const { clause, idVar, values } = getSqlUpdateParts(entity, pureORMDataArray, on);
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
    const { whereClause, values } = getMatchingParts(entity, pureORMDataArray);
    const query = `
      DELETE FROM "${getTableNameForEntity(entity, pureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return none(query, values);
  };

  const getMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity, pureORMDataArray);
    const query = `
      SELECT ${getSelectColumnsClauseForEntity(entity, pureORMDataArray)}
      FROM "${getTableNameForEntity(entity, pureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return one(query, values) as T;
  };

  const getOneOrNoneMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity, pureORMDataArray);
    const query = `
      SELECT ${getSelectColumnsClauseForEntity(entity, pureORMDataArray)}
      FROM "${getTableNameForEntity(entity, pureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return oneOrNone(query, values);
  };

  const getAnyMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity, pureORMDataArray);
    const query = `
      SELECT ${getSelectColumnsClauseForEntity(entity, pureORMDataArray)}
      FROM "${getTableNameForEntity(entity, pureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return any(query, values);
  };

  const getAllMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity, pureORMDataArray);
    const query = `
      SELECT ${getSelectColumnsClauseForEntity(entity, pureORMDataArray)}
      FROM "${getTableNameForEntity(entity, pureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return many(query, values);
  };

  return {
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
