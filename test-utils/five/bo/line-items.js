const { BaseBoCollection } = require('../../../src/index');

class LineItems extends BaseBoCollection {
  static get Bo() {
    return require('./line-item'); // eslint-disable-line
  }
}

module.exports = LineItems;
