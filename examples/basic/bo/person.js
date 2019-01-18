const BaseBo = require('./base');

class Person extends BaseBo {
  get Bo() {
    return Person;
  }

  static get tableName() {
    return 'person';
  }

  static get sqlColumnsData() {
    return ['id', 'first_name', 'last_name', 'email'];
  }
}

module.exports = Person;
