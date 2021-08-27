const Base = require('./base');

class UtmSource extends Base {
  static get tableName() {
    return 'utm_source';
  }

  static get sqlColumnsData() {
    return ['id', 'value', 'label', 'internal'];
  }
}

module.exports = UtmSource;
