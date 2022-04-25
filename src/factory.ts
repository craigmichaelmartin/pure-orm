import {
  createOneFromDatabase,
  createOneOrNoneFromDatabase,
  createManyFromDatabase,
  createFromDatabase,
  getSqlUpdateParts,
  getSqlInsertParts,
  getTableName,
  getColumns,
  getDisplayName,
  Entity,
  EntityConstructor,
} from './business-object';

export interface PureORM {
  one: (query: string, params?: object) => Entity;
  oneOrNone: (query: string, params: object) => Entity | void;
  many: (query: string, params: object) => Array<Entity>;
  any: (query: string, params: object) => Array<Entity> | void;
  none: (query: string, params: object) => void;
  getMatching: (bo: Entity) => Entity;
  getOneOrNoneMatching: (bo: Entity) => Entity | void;
  getAnyMatching: (bo: Entity) => Array<Entity> | void;
  getAllMatching: (bo: Entity) => Array<Entity>;
  create: (bo: Entity) => Entity;
  update: (bo: Entity) => Entity;
  delete: (bo: Entity) => void;
  deleteMatching: (bo: Entity) => void;
  tables: { [key:string]: { [key: string]: string; }};
}


export interface CreateOptions{
  getBusinessObjects: () => Array<EntityConstructor>;
  db: any;
  logError?: (err: Error) => void;
}

export const create = ({ getBusinessObjects, db, logError }: CreateOptions): PureORM => {
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

  const one = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .many(query, values)
      .then((rows: any) => createOneFromDatabase(rows, getBusinessObjects))
      .catch(errorHandler);
  };

  const oneOrNone = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createOneOrNoneFromDatabase(rows, getBusinessObjects))
      .catch(errorHandler);
  };

  const many = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createManyFromDatabase(rows, getBusinessObjects))
      .catch(errorHandler);
  };

  const any = (query: string, values?: object, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then((rows: any) => createFromDatabase(rows, getBusinessObjects))
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
  const create = (bo: any) => {
    const { columns, values, valuesVar } = getSqlInsertParts(bo);
    const query = `
      INSERT INTO "${getTableName(bo)}" ( ${columns} )
      VALUES ( ${valuesVar} )
      RETURNING ${getColumns(bo)};
    `;
    return one(query, values);
  };

  // Standard update
  const update = (bo: any, { on = 'id' } = {}) => {
    const { clause, idVar, values } = getSqlUpdateParts(bo, on);
    const query = `
      UPDATE "${getTableName(bo)}"
      SET ${clause}
      WHERE "${getTableName(bo)}".${on} = ${idVar}
      RETURNING ${getColumns(bo)};
    `;
    return one(query, values);
  };

  // Standard delete
  const _delete = (bo: any) => {
    const id = bo.id;
    const query = `
      DELETE FROM "${getTableName(bo)}"
      WHERE "${getTableName(bo)}".id = $(id)
    `;
    return none(query, { id });
  };

  const deleteMatching = (bo: any) => {
    const { whereClause, values } = bo.getMatchingParts();
    const query = `
      DELETE FROM "${getTableName(bo)}"
      WHERE ${whereClause};
    `;
    return none(query, values);
  };

  const getMatching = (bo: any) => {
    const { whereClause, values } = bo.getMatchingParts();
    const query = `
      SELECT ${getColumns(bo)}
      FROM "${getTableName(bo)}"
      WHERE ${whereClause};
    `;
    return one(query, values);
  };

  const getOneOrNoneMatching = (bo: any) => {
    const { whereClause, values } = bo.getMatchingParts();
    const query = `
      SELECT ${getColumns(bo)}
      FROM "${getTableName(bo)}"
      WHERE ${whereClause};
    `;
    return oneOrNone(query, values);
  };

  const getAnyMatching = (bo: any) => {
    const { whereClause, values } = bo.getMatchingParts();
    const query = `
      SELECT ${getColumns(bo)}
      FROM "${getTableName(bo)}"
      WHERE ${whereClause};
    `;
    return any(query, values);
  };

  const getAllMatching = (bo: any) => {
    const { whereClause, values } = bo.getMatchingParts();
    const query = `
      SELECT ${getColumns(bo)}
      FROM "${getTableName(bo)}"
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
    tables: getBusinessObjects().reduce((accum: any, Bo: EntityConstructor) => {
      accum[getDisplayName(Bo)] = getColumns(Bo);
      return accum;
    }, {})
  };
};
