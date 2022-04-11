class Person {
  constructor(props) {
    Object.assign(this, props);
  }
  static get tableName() {
    return 'person';
  }

  static get sqlColumnsData() {
    return ['id', 'first_name', 'last_name', 'email'];
  }
}

module.exports = Person;
