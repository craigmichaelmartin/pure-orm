const { BaseBoCollection } = require('../../../src/index');

class ShipmentActualProductVariants extends BaseBoCollection {
  static get Bo() {
    return require('./shipment-actual-product-variant'); // eslint-disable-line
  }
}

module.exports = ShipmentActualProductVariants;
