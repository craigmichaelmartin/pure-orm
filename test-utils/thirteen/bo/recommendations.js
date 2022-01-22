const { BaseBoCollection } = require('../../../src/index');

class Recommendations extends BaseBoCollection {
  static get Bo() {
    return require('./recommendation'); // eslint-disable-line
  }
}

module.exports = Recommendations;
