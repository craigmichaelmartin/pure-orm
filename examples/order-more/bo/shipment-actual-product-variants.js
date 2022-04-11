class ShipmentActualProductVariants {
  static get Bo() {
    return require('./shipment-actual-product-variant'); // eslint-disable-line
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = ShipmentActualProductVariants;
