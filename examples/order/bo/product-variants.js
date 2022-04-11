class ProductVariants {
  static get Bo() {
    return require('./product-variant'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = ProductVariants;
