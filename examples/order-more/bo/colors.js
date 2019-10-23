const { BaseBoCollection } = require('../../../src/index');

class Colors extends BaseBoCollection {
  static get Bo() {
    return require('./color'); // eslint-disable-line
  }
}

module.exports = Colors;
