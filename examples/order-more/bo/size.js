const Base = require('./base');
const Sizes = require('./sizes');

class Size extends Base {
  get BoCollection() {
    return Sizes;
  }

  static get tableName() {
    return 'size';
  }

  static get sqlColumnsData() {
    return ['id', 'value', 'label'];
  }
}

module.exports = Size;
