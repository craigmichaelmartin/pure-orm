const Base = require('./base');
const Colors = require('./colors');

class Color extends Base {
  get BoCollection() {
    return Colors;
  }

  static get tableName() {
    return 'color';
  }

  static get sqlColumnsData() {
    return ['id', 'value', 'label', 'position', 'image_url'];
  }
}

module.exports = Color;
