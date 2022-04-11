class UtmSource {
  constructor(props) {
    Object.assign(this, props);
  }

  static get tableName() {
    return 'utm_source';
  }

  static get sqlColumnsData() {
    return ['id', 'value', 'label', 'internal'];
  }
}

module.exports = UtmSource;
