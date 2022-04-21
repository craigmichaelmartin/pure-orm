class Sizes {
  static get Bo() {
    return require('./size'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Sizes;
