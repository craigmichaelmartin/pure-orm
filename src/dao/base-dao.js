const { Left, Right } = require('../lib/either');
const { getColumnsValuesFromInsertError } = require('../util/helpers');

/*
 * A wrapper function returning the base data access abstraction.
 */
module.exports = ({ getTableData, db: closureDB, logError: closureLogError }) =>
  class BaseDAO {
    constructor({ db, singleToCollection, logError } = {}) {
      this.db = db || closureDB;
      this.singleToCollection =
        singleToCollection || getTableData().singleToCollection;
      this.logError = logError || closureLogError;
      this.ensureExists = this.getOrCreate; // alias
      this.errorHandler = this.errorHandler.bind(this);
      this.createBo = this.createBo.bind(this);
      this.createBoCollection = this.createBoCollection.bind(this);
    }

    /* Nice abstractions over this.db ---------------------------------------*/
    /* ----------------------------------------------------------------------*/

    one(query, values) {
      return this.db
        .one(query, values)
        .then(this.createBo)
        .catch(this.errorHandler);
    }

    oneFromMany(query, values) {
      return this.db
        .many(query, values)
        .then(this.createBo)
        .catch(this.errorHandler);
    }

    many(query, values) {
      return this.db
        .many(query, values)
        .then(this.createBoCollection)
        .catch(this.errorHandler);
    }

    any(query, values) {
      return this.db
        .any(query, values)
        .then(this.createBoCollection)
        .catch(this.errorHandler);
    }

    // "raw" (non BO) row result
    row(query, values) {
      return this.db
        .one(query, values)
        .then(Right)
        .catch(this.errorHandler);
    }

    // "raw" (no BO) rows result
    rows(query, values) {
      return this.db
        .any(query, values)
        .then(Right)
        .catch(this.errorHandler);
    }

    /* Piecemeal endings if using this.db directly --------------------------*/
    /* ----------------------------------------------------------------------*/

    errorHandler(err) {
      if (!err.name === 'QueryResultError') {
        this.logError(err);
      }
      return Left(err);
    }

    createBo(row) {
      return Right(new this.Bo(this.Bo.parseFromDatabase(row)));
    }

    createBoCollection(rows) {
      return Right(
        new this.BoCollection(this.BoCollection.parseFromDatabase(rows))
      );
    }

    /* Built-in basic DAO methods -------------------------------------------*/
    /* ----------------------------------------------------------------------*/

    // Standard create
    create(bo) {
      const { columns, values, valuesVar } = bo.getSqlInsertParts();
      const query = `
        INSERT INTO "${bo.c.tableName}" ( ${columns} )
        VALUES ( ${valuesVar} )
        RETURNING ${bo.c.getSQLSelectClause()};
      `;
      return this.one(query, values);
    }

    // Standard update
    update(bo) {
      const { clause, idVar, values } = bo.getSqlUpdateParts();
      const query = `
        UPDATE "${bo.c.tableName}"
        SET ${clause}
        WHERE "${bo.c.tableName}".id = ${idVar}
        RETURNING ${bo.c.getSQLSelectClause()};
      `;
      return this.one(query, values);
    }

    // Standard delete
    delete(bo) {
      const id = bo.id;
      const query = `
        DELETE FROM "${bo.c.tableName}"
        WHERE "${bo.c.tableName}".id = ${id}
      `;
      return this.db
        .none(query)
        .then(data => Right(data))
        .catch(this.errorHandler);
    }

    getMatching(bo) {
      const { whereClause, values } = bo.getMatchingParts();
      const query = `
        SELECT ${bo.c.getSQLSelectClause()}
        FROM "${bo.c.tableName}"
        WHERE ${whereClause};
      `;
      return this.one(query, values);
    }

    getAllMatching(bo) {
      const { whereClause, values } = bo.getMatchingParts();
      const query = `
        SELECT ${bo.c.getSQLSelectClause()}
        FROM "${bo.c.tableName}"
        WHERE ${whereClause};
      `;
      return this.db
        .many(query, values)
        .then(rows => {
          const Con = this.singleToCollection[bo.c.displayName];
          return Right(new Con(Con.parseFromDatabase(rows))); // eslint-disable-line
        })
        .catch(this.errorHandler);
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
