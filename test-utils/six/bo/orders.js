const { BaseBoCollection } = require('../../../src/index');

class Orders extends BaseBoCollection {
  static get Bo() {
    return require('./order'); // eslint-disable-line
  }
}

module.exports = Orders;
