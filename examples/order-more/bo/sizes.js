const { BaseBoCollection } = require('../../../src/index');

class Sizes extends BaseBoCollection {
  static get Bo() {
    return require('./size'); // eslint-disable-line
  }
}

module.exports = Sizes;
