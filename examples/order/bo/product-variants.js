const { BaseBoCollection } = require('../../../src/index');

class ProductVariants extends BaseBoCollection {
  static get Bo() {
    return require('./product-variant'); // eslint-disable-line
  }
}

module.exports = ProductVariants;
