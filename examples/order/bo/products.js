const { BaseBoCollection } = require('../../../src/index');

class Products extends BaseBoCollection {
  static get Bo() {
    return require('./product'); // eslint-disable-line
  }
}

module.exports = Products;
