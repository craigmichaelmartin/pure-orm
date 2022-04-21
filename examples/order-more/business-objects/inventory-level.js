const InventoryLevels = require('./inventory-levels');
const ActualProductVariant = require('./actual-product-variant');
const Shipment = require('./shipment');

class InventoryLevel {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return InventoryLevels;
  }

  static get tableName() {
    return 'inventory_level';
  }

  static get sqlColumnsData() {
    return [
      'id',
      'inventory_location_id',
      { column: 'actual_product_variant_id', references: ActualProductVariant },
      'available',
      { column: 'next_shipment_id', references: Shipment },
      'sellable_when_sold_out',
      'updated_date'
    ];
  }
}

module.exports = InventoryLevel;
