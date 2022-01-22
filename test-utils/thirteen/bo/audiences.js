const { BaseBoCollection } = require('../../../src/index');

class Audiences extends BaseBoCollection {
  static get Bo() {
    return require('./audience'); // eslint-disable-line
  }
}

module.exports = Audiences;
