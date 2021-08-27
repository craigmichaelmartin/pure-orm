const Base = require('./base');

class UtmMedium extends Base {
  static get tableName() {
    return 'utm_medium';
  }

  static get sqlColumnsData() {
    return ['id', 'value', 'label'];
  }
}

module.exports = UtmMedium;
