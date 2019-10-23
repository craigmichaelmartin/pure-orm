const { BaseBoCollection } = require('../../../src/index');

class Shipments extends BaseBoCollection {
  static get Bo() {
    return require('./shipment'); // eslint-disable-line
  }
}

module.exports = Shipments;
