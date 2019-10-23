const { BaseBoCollection } = require('../../../src/index');

class InventoryLevels extends BaseBoCollection {
  static get Bo() {
    return require('./inventory-level'); // eslint-disable-line
  }
}

module.exports = InventoryLevels;
