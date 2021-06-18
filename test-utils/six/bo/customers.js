const { BaseBoCollection } = require('../../../src/index');

class Customers extends BaseBoCollection {
  static get Bo() {
    return require('./customer'); // eslint-disable-line
  }
}

module.exports = Customers;
