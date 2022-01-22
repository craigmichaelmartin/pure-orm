const { BaseBoCollection } = require('../../../src/index');

class Categories extends BaseBoCollection {
  static get Bo() {
    return require('./category'); // eslint-disable-line
  }
  static get displayName() {
    return 'categories';
  }
}

module.exports = Categories;
