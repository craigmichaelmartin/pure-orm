const Base = require('./base');
const Audiences = require('./audiences');

class Audience extends Base {
  get BoCollection() {
    return Audiences;
  }

  static get tableName() {
    return 'audience';
  }

  static get sqlColumnsData() {
    return ['id'];
  }
}

module.exports = Audience;
