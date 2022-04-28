const Shipments = require('./shipments');

class Shipment {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return Shipments;
  }

  static get tableName() {
    return 'shipment';
  }

  static get sqlColumnsData() {
    return ['id', 'inventory_location_id', 'sellable_date'];
  }
}

module.exports = Shipment;
