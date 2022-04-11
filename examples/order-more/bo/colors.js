class Colors {
  static get Bo() {
    return require('./color'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Colors;
