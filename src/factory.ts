import {
  createOneFromDatabase,
  createOneOrNoneFromDatabase,
  createManyFromDatabase,
  createFromDatabase,
  getSqlUpdateParts,
  getSqlInsertParts,
  getTableNameForEntity,
  getColumnsForEntity,
  getColumns,
  getDisplayName,
  getMatchingParts,
  IPureORMData,
  IPureORMDataArray,
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
      .then((rows: any) => createOneFromDatabase(rows, getPureORMDataArray))
      .catch(errorHandler);
  };

  const oneOrNone = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createOneOrNoneFromDatabase(rows, getPureORMDataArray))
      .catch(errorHandler);
  };

  const many = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createManyFromDatabase(rows, getPureORMDataArray))
      .catch(errorHandler);
  };

  const any = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createFromDatabase(rows, getPureORMDataArray))
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
    const { columns, values, valuesVar } = getSqlInsertParts(entity, getPureORMDataArray);
    const query = `
      INSERT INTO "${getTableNameForEntity(entity, getPureORMDataArray)}" ( ${columns} )
      VALUES ( ${valuesVar} )
      RETURNING ${getColumnsForEntity(entity, getPureORMDataArray)};
    `;
    return one(query, values) as T;
  };

  // Standard update
  const update = <T>(entity: T, { on = 'id' } = {}) => {
    const { clause, idVar, values } = getSqlUpdateParts(entity, getPureORMDataArray, on);
    const query = `
      UPDATE "${getTableNameForEntity(entity, getPureORMDataArray)}"
      SET ${clause}
      WHERE "${getTableNameForEntity(entity, getPureORMDataArray)}".${on} = ${idVar}
      RETURNING ${getColumnsForEntity(entity, getPureORMDataArray)};
    `;
    return one(query, values) as T;
  };

  // Standard delete
  const _delete = <T>(entity: T) => {
    const id = (entity as any).id;
    const query = `
      DELETE FROM "${getTableNameForEntity(entity, getPureORMDataArray)}"
      WHERE "${getTableNameForEntity(entity, getPureORMDataArray)}".id = $(id)
    `;
    return none(query, { id });
  };

  const deleteMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity, getPureORMDataArray);
    const query = `
      DELETE FROM "${getTableNameForEntity(entity, getPureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return none(query, values);
  };

  const getMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity, getPureORMDataArray);
    const query = `
      SELECT ${getColumnsForEntity(entity, getPureORMDataArray)}
      FROM "${getTableNameForEntity(entity, getPureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return one(query, values) as T;
  };

  const getOneOrNoneMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity, getPureORMDataArray);
    const query = `
      SELECT ${getColumnsForEntity(entity, getPureORMDataArray)}
      FROM "${getTableNameForEntity(entity, getPureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return oneOrNone(query, values);
  };

  const getAnyMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity, getPureORMDataArray);
    const query = `
      SELECT ${getColumnsForEntity(entity, getPureORMDataArray)}
      FROM "${getTableNameForEntity(entity, getPureORMDataArray)}"
      WHERE ${whereClause};
    `;
    return any(query, values);
  };

  const getAllMatching = <T>(entity: T) => {
    const { whereClause, values } = getMatchingParts(entity, getPureORMDataArray);
    const query = `
      SELECT ${getColumnsForEntity(entity, getPureORMDataArray)}
      FROM "${getTableNameForEntity(entity, getPureORMDataArray)}"
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
    tables: getPureORMDataArray().reduce((accum: any, data: IPureORMData<any>) => {
      accum[getDisplayName(data)] = getColumns(data);
      return accum;
    }, {})
  };
};
