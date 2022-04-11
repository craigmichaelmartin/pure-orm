const {
  createOneFromDatabase,
  createOneOrNoneFromDatabase,
  createManyFromDatabase,
  createFromDatabase,
  getSqlUpdateParts,
  getSqlInsertParts,
  getTableName,
  getColumns,
  getDisplayName,
} = require('./bo');


module.exports.create = ({ getBusinessObjects, db, logError }) => {

  const defaultErrorHandler = (err) => {
    if (!err.name === 'QueryResultError') {
      logError(err);
    }
    throw err;
  };

  /* ------------------------------------------------------------------------*/
  /* Query functions --------------------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  const one = (query, values, errorHandler = defaultErrorHandler) => {
    return db
      .many(query, values)
      .then(rows => createOneFromDatabase(rows, getBusinessObjects))
      .catch(errorHandler);
  };

  const oneOrNone = (query, values, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then(rows => createOneOrNoneFromDatabase(rows, getBusinessObjects))
      .catch(errorHandler);
  };

  const many = (query, values, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then(rows => createManyFromDatabase(rows, getBusinessObjects))
      .catch(errorHandler);
  };

  const any = (query, values, errorHandler = defaultErrorHandler) => {
    return db
      .any(query, values)
      .then(rows => createFromDatabase(rows, getBusinessObjects))
      .catch(errorHandler);
  };

  const none = (query, values, errorHandler = defaultErrorHandler) => {
    return db
      .none(query, values)
      .then(() => null)
      .catch(errorHandler);
  };

  /* ------------------------------------------------------------------------*/
  /* Built-in basic CRUD functions ------------------------------------------*/
  /* ------------------------------------------------------------------------*/

  // Standard create
  const create = (bo) => {
    const { columns, values, valuesVar } = getSqlInsertParts(bo);
    const query = `
      INSERT INTO "${getTableName(bo)}" ( ${columns} )
      VALUES ( ${valuesVar} )
      RETURNING ${getColumns(bo)};
    `;
    return one(query, values);
  };

  // Standard update
  const update = (bo, { on = 'id' } = {}) => {
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
  const _delete = (bo) => {
    const id = bo.id;
    const query = `
      DELETE FROM "${getTableName(bo)}"
      WHERE "${getTableName(bo)}".id = ${id}
    `;
    return none(query);
  };

  const deleteMatching = (bo) => {
    const { whereClause, values } = bo.getMatchingParts();
    const query = `
      DELETE FROM "${getTableName(bo)}"
      WHERE ${whereClause};
    `;
    return none(query, values);
  };

  const getMatching = (bo) => {
    const { whereClause, values } = bo.getMatchingParts();
    const query = `
      SELECT ${getColumns(bo)}
      FROM "${getTableName(bo)}"
      WHERE ${whereClause};
    `;
    return one(query, values);
  };

  const getOneOrNoneMatching = (bo) => {
    const { whereClause, values } = bo.getMatchingParts();
    const query = `
      SELECT ${getColumns(bo)}
      FROM "${getTableName(bo)}"
      WHERE ${whereClause};
    `;
    return oneOrNone(query, values);
  };

  const getAnyMatching = (bo) => {
    const { whereClause, values } = bo.getMatchingParts();
    const query = `
      SELECT ${getColumns(bo)}
      FROM "${getTableName(bo)}"
      WHERE ${whereClause};
    `;
    return any(query, values);
  };

  const getAllMatching = (bo) => {
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
    tables: getBusinessObjects().reduce((accum, Bo) => {
      accum[getDisplayName(Bo)] = getColumns(Bo);
      return accum;
    }, {}),
  };
};
