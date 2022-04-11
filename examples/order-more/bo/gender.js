const Genders = require('./genders');

class Gender {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return Genders;
  }

  static get tableName() {
    return 'gender';
  }

  static get sqlColumnsData() {
    return ['id', 'value', 'label'];
  }
}

module.exports = Gender;
