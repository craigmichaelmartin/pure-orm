const { BaseBoCollection } = require('../../../src/index');

class Genders extends BaseBoCollection {
  static get Bo() {
    return require('./gender'); // eslint-disable-line
  }
}

module.exports = Genders;
