const Colors = require('./colors');

class Color {
  constructor(props) {
    Object.assign(this, props);
  }

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
