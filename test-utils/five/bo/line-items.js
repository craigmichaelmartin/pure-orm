class LineItems {
  static get Bo() {
    return require('./line-item'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = LineItems;
