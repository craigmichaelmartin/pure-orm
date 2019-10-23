const { BaseBoCollection } = require('../../../src/index');

class ProductVariantImages extends BaseBoCollection {
  static get Bo() {
    return require('./product-variant-image'); // eslint-disable-line
  }
}

module.exports = ProductVariantImages;
