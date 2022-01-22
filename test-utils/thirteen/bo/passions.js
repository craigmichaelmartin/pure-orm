const { BaseBoCollection } = require('../../../src/index');

class Passions extends BaseBoCollection {
  static get Bo() {
    return require('./passion'); // eslint-disable-line
  }
}

module.exports = Passions;
