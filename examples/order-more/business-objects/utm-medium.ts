class UtmMedium {
  constructor(props) {
    Object.assign(this, props);
  }

  static get tableName() {
    return 'utm_medium';
  }

  static get sqlColumnsData() {
    return ['id', 'value', 'label'];
  }
}

module.exports = UtmMedium;
