"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = void 0;
const business_object_1 = require("./business-object");
const create = ({ getBusinessObjects, db, logError }) => {
    const defaultErrorHandler = (err) => {
        if (!(err.name === 'QueryResultError')) {
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
            .then((rows) => (0, business_object_1.createOneFromDatabase)(rows, getBusinessObjects))
            .catch(errorHandler);
    };
    const oneOrNone = (query, values, errorHandler = defaultErrorHandler) => {
        return db
            .any(query, values)
            .then((rows) => (0, business_object_1.createOneOrNoneFromDatabase)(rows, getBusinessObjects))
            .catch(errorHandler);
    };
    const many = (query, values, errorHandler = defaultErrorHandler) => {
        return db
            .any(query, values)
            .then((rows) => (0, business_object_1.createManyFromDatabase)(rows, getBusinessObjects))
            .catch(errorHandler);
    };
    const any = (query, values, errorHandler = defaultErrorHandler) => {
        return db
            .any(query, values)
            .then((rows) => (0, business_object_1.createFromDatabase)(rows, getBusinessObjects))
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
        const { columns, values, valuesVar } = (0, business_object_1.getSqlInsertParts)(bo);
        const query = `
      INSERT INTO "${(0, business_object_1.getTableName)(bo)}" ( ${columns} )
      VALUES ( ${valuesVar} )
      RETURNING ${(0, business_object_1.getColumns)(bo)};
    `;
        return one(query, values);
    };
    // Standard update
    const update = (bo, { on = 'id' } = {}) => {
        const { clause, idVar, values } = (0, business_object_1.getSqlUpdateParts)(bo, on);
        const query = `
      UPDATE "${(0, business_object_1.getTableName)(bo)}"
      SET ${clause}
      WHERE "${(0, business_object_1.getTableName)(bo)}".${on} = ${idVar}
      RETURNING ${(0, business_object_1.getColumns)(bo)};
    `;
        return one(query, values);
    };
    // Standard delete
    const _delete = (bo) => {
        const id = bo.id;
        const query = `
      DELETE FROM "${(0, business_object_1.getTableName)(bo)}"
      WHERE "${(0, business_object_1.getTableName)(bo)}".id = $(id)
    `;
        return none(query, { id });
    };
    const deleteMatching = (bo) => {
        const { whereClause, values } = bo.getMatchingParts();
        const query = `
      DELETE FROM "${(0, business_object_1.getTableName)(bo)}"
      WHERE ${whereClause};
    `;
        return none(query, values);
    };
    const getMatching = (bo) => {
        const { whereClause, values } = bo.getMatchingParts();
        const query = `
      SELECT ${(0, business_object_1.getColumns)(bo)}
      FROM "${(0, business_object_1.getTableName)(bo)}"
      WHERE ${whereClause};
    `;
        return one(query, values);
    };
    const getOneOrNoneMatching = (bo) => {
        const { whereClause, values } = bo.getMatchingParts();
        const query = `
      SELECT ${(0, business_object_1.getColumns)(bo)}
      FROM "${(0, business_object_1.getTableName)(bo)}"
      WHERE ${whereClause};
    `;
        return oneOrNone(query, values);
    };
    const getAnyMatching = (bo) => {
        const { whereClause, values } = bo.getMatchingParts();
        const query = `
      SELECT ${(0, business_object_1.getColumns)(bo)}
      FROM "${(0, business_object_1.getTableName)(bo)}"
      WHERE ${whereClause};
    `;
        return any(query, values);
    };
    const getAllMatching = (bo) => {
        const { whereClause, values } = bo.getMatchingParts();
        const query = `
      SELECT ${(0, business_object_1.getColumns)(bo)}
      FROM "${(0, business_object_1.getTableName)(bo)}"
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
            accum[(0, business_object_1.getDisplayName)(Bo)] = (0, business_object_1.getColumns)(Bo);
            return accum;
        }, {})
    };
};
exports.create = create;
