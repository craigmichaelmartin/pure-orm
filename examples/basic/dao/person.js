const BaseDAO = require('./base');
const Person = require('../bo/person');
const { errorHandler, Right } = require('sql-toolkit');

/*
 * The person data abstraction for the persistence mechinism.
 */
module.exports = class PersonDAO extends BaseDAO {
  getRandom() {
    const query = `
      SELECT ${Person.getSQLSelectClause()}
      FROM person
      ORDER BY random()
      LIMIT 1;
    `;
    return this.db
      .one(query)
      .then(result => Right(new Person(Person.parseFromDatabase(result))))
      .catch(errorHandler(this.logError));
  }
};
