const { Left, Right } = require('uter');
const { getColumnsValuesFromInsertError } = require('../util/helpers');

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
        .then(rows => Right(this.Bo.createOneFromDatabase(rows)))
        .catch(errorHandler);
    }

    oneOrNone(query, values, errorHandler = this.errorHandler) {
      return this.db
        .any(query, values)
        .then(rows => Right(this.Bo.createOneOrNoneFromDatabase(rows)))
        .catch(errorHandler);
    }

    many(query, values, errorHandler = this.errorHandler) {
      return this.db
        .any(query, values)
        .then(rows => Right(this.Bo.createManyFromDatabase(rows)))
        .catch(errorHandler);
    }

    any(query, values, errorHandler = this.errorHandler) {
      return this.db
        .any(query, values)
        .then(rows => Right(this.Bo.createFromDatabase(rows)))
        .catch(errorHandler);
    }

    none(query, values, errorHandler = this.errorHandler) {
      return this.db.none(query, values).catch(errorHandler);
    }

    /* Piecemeal endings if using this.db directly --------------------------*/
    /* ----------------------------------------------------------------------*/

    errorHandler(err) {
      if (!err.name === 'QueryResultError') {
        this.logError(err);
      }
      return Left(err);
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
    update(bo) {
      const { clause, idVar, values } = bo.getSqlUpdateParts();
      const query = `
        UPDATE "${bo.constructor.tableName}"
        SET ${clause}
        WHERE "${bo.constructor.tableName}".id = ${idVar}
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
      return this.db
        .none(query)
        .then(data => Right(data))
        .catch(this.errorHandler);
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

    getOrCreate(bo) {
      return this.create(bo).then(lor => {
        return lor.tryfix(err => {
          const [keys, values] = getColumnsValuesFromInsertError(
            err.detail,
            bo
          );
          if (keys) {
            const matchingBo = bo.getNewWith(keys, values);
            return this.getMatching(matchingBo);
          }
          return Left(err);
        });
      });
    }

    // fyi: ALL fields must be present in the bo (for it to be created correctly
    // if necessary) but that makes the matching unrealistic/undesired.
    // Thus this method is likely practically unusable.
    getMatchOrCreate(bo) {
      return this.getMatching(bo).then(obj => {
        let matchingBo;
        try {
          matchingBo = obj.val();
        } catch (_err) {}
        if (matchingBo) {
          return Right(matchingBo);
        }
        return this.create(bo);
      });
    }
  };
