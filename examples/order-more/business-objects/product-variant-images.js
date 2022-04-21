class ProductVariantImages {
  static get Bo() {
    return require('./product-variant-image'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = ProductVariantImages;
