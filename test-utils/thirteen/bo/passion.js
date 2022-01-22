const Base = require('./base');
const Passions = require('./passions');

class Passion extends Base {
  get BoCollection() {
    return Passions;
  }

  static get tableName() {
    return 'passion';
  }

  static get sqlColumnsData() {
    return ['id'];
  }
}

module.exports = Passion;
