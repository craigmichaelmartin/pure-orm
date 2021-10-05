const { BaseBoCollection } = require('../../../src/index');

class Prompts extends BaseBoCollection {
  static get Bo() {
    return require('./prompt'); // eslint-disable-line
  }
}

module.exports = Prompts;
