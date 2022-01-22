const { BaseBoCollection } = require('../../../src/index');

class Brands extends BaseBoCollection {
  static get Bo() {
    return require('./brand'); // eslint-disable-line
  }
}

module.exports = Brands;
