/*
 * A wrapper function returning the base data access abstraction.
 */
module.exports = ({ db: closureDB, logError: closureLogError }) =>
  class BaseDAO {
    constructor({ db, logError } = {}) {
      this.db = db || closureDB;
      this.logError = logError || closureLogError;
      this.ensureExists = this.getOrCreate; // alias
      this.manyOrNone = this.any; // alias
      this.errorHandler = this.errorHandler.bind(this);
    }

    /* Nice abstractions over this.db ---------------------------------------*/
    /* ----------------------------------------------------------------------*/

    one(query, values, errorHandler = this.errorHandler) {
      return this.db
        .many(query, values)
        .then(rows => this.Bo.createOneFromDatabase(rows))
        .catch(errorHandler);
    }

    oneOrNone(query, values, errorHandler = this.errorHandler) {
      return this.db
        .any(query, values)
        .then(rows => this.Bo.createOneOrNoneFromDatabase(rows))
        .catch(errorHandler);
    }

    many(query, values, errorHandler = this.errorHandler) {
      return this.db
        .any(query, values)
        .then(rows => this.Bo.createManyFromDatabase(rows))
        .catch(errorHandler);
    }

    any(query, values, errorHandler = this.errorHandler) {
      return this.db
        .any(query, values)
        .then(rows => this.Bo.createFromDatabase(rows))
        .catch(errorHandler);
    }

    none(query, values, errorHandler = this.errorHandler) {
      return this.db
        .none(query, values)
        .then(() => null)
        .catch(errorHandler);
    }

    /* Piecemeal endings if using this.db directly --------------------------*/
    /* ----------------------------------------------------------------------*/

    errorHandler(err) {
      if (!err.name === 'QueryResultError') {
        this.logError(err);
      }
      throw err;
    }

    /* Built-in basic DAO methods -------------------------------------------*/
    /* ----------------------------------------------------------------------*/

    // Standard create
    create(bo) {
      const { columns, values, valuesVar } = bo.getSqlInsertParts();
      const query = `
        INSERT INTO "${bo.constructor.tableName}" ( ${columns} )
        VALUES ( ${valuesVar} )
        RETURNING ${bo.constructor.getSQLSelectClause()};
      `;
      return this.one(query, values);
    }

    // Standard update
    update(bo, { on = 'id' } = {}) {
      const { clause, idVar, values } = bo.getSqlUpdateParts(on);
      const query = `
        UPDATE "${bo.constructor.tableName}"
        SET ${clause}
        WHERE "${bo.constructor.tableName}".${on} = ${idVar}
        RETURNING ${bo.constructor.getSQLSelectClause()};
      `;
      return this.one(query, values);
    }

    // Standard delete
    delete(bo) {
      const id = bo.id;
      const query = `
        DELETE FROM "${bo.constructor.tableName}"
        WHERE "${bo.constructor.tableName}".id = ${id}
      `;
      return this.none(query);
    }

    deleteMatching(bo) {
      const { whereClause, values } = bo.getMatchingParts();
      const query = `
        DELETE FROM "${bo.constructor.tableName}"
        WHERE ${whereClause};
      `;
      return this.none(query, values);
    }

    getMatching(bo) {
      const { whereClause, values } = bo.getMatchingParts();
      const query = `
        SELECT ${bo.constructor.getSQLSelectClause()}
        FROM "${bo.constructor.tableName}"
        WHERE ${whereClause};
      `;
      return this.one(query, values);
    }

    getOneOrNoneMatching(bo) {
      const { whereClause, values } = bo.getMatchingParts();
      const query = `
        SELECT ${bo.constructor.getSQLSelectClause()}
        FROM "${bo.constructor.tableName}"
        WHERE ${whereClause};
      `;
      return this.oneOrNone(query, values);
    }

    getAnyMatching(bo) {
      const { whereClause, values } = bo.getMatchingParts();
      const query = `
        SELECT ${bo.constructor.getSQLSelectClause()}
        FROM "${bo.constructor.tableName}"
        WHERE ${whereClause};
      `;
      return this.any(query, values);
    }

    getAllMatching(bo) {
      const { whereClause, values } = bo.getMatchingParts();
      const query = `
        SELECT ${bo.constructor.getSQLSelectClause()}
        FROM "${bo.constructor.tableName}"
        WHERE ${whereClause};
      `;
      return this.many(query, values);
    }
  };
