const { BaseBoCollection } = require('../../../src/index');

class Refunds extends BaseBoCollection {
  static get Bo() {
    return require('./refund'); // eslint-disable-line
  }
}

module.exports = Refunds;
