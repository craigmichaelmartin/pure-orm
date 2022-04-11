class Brands {
  static get Bo() {
    return require('./brand'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Brands;
