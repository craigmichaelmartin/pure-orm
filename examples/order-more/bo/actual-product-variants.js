const { BaseBoCollection } = require('../../../src/index');

class ActualProductVariants extends BaseBoCollection {
  static get Bo() {
    return require('./actual-product-variant'); // eslint-disable-line
  }
}

module.exports = ActualProductVariants;
