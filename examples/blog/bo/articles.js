const { BaseBoCollection } = require('../../../src/index');

class Articles extends BaseBoCollection {
  static get Bo() {
    return require('./article'); // eslint-disable-line
  }
}

module.exports = Articles;
