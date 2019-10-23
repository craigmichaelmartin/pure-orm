const Base = require('./base');
const Genders = require('./genders');

class Gender extends Base {
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
