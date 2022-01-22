const { BaseBoCollection } = require('../../../src/index');

class Members extends BaseBoCollection {
  static get Bo() {
    return require('./member'); // eslint-disable-line
  }
}

module.exports = Members;
