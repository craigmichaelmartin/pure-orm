const BaseBo = require('./base');

class Person extends BaseBo {
  get c() {
    return Person;
  }

  static get tableName() {
    return 'person';
  }

  static get columns() {
    return ['id', 'firstName', 'lastName', 'email'];
  }

  static get sqlColumns() {
    return ['id', 'first_name', 'last_name', 'email'];
  }
}

module.exports = Person;
