const Person = require('../business-objects/person');

/*
 * The person data abstraction for the persistence mechinism.
 */
module.exports = class PersonDAO {
  get Bo() {
    return Person;
  }

  getRandom() {
    const query = `
      SELECT ${Person.getSQLSelectClause()}
      FROM person
      ORDER BY random()
      LIMIT 1;
    `;
    return this.one(query);
  }
};
