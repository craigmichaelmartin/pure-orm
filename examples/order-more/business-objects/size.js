const Sizes = require('./sizes');

class Size {
  constructor(props) {
    Object.assign(this, props);
  }

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
