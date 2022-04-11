class Products {
  static get Bo() {
    return require('./product'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Products;
