class Recommendations {
  static get Bo() {
    return require('./recommendation'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Recommendations;
