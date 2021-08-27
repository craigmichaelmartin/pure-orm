const Base = require('./base');
const ShipmentActualProductVariants = require('./shipment-actual-product-variants');
const ActualProductVariant = require('./actual-product-variant');
const Shipment = require('./shipment');

class ShipmentActualProductVariant extends Base {
  get BoCollection() {
    return ShipmentActualProductVariants;
  }

  static get tableName() {
    return 'shipment_actual_product_variant';
  }

  static get sqlColumnsData() {
    return [
      'id',
      { column: 'shipment_id', references: Shipment },
      { column: 'actual_product_variant_id', references: ActualProductVariant },
      'quantity',
      'updated_date'
    ];
  }
}

module.exports = ShipmentActualProductVariant;
