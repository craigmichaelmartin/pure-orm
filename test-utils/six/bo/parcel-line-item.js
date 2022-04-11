const ParcelLineItems = require('./parcel-line-items');
const Parcel = require('./parcel');
const LineItem = require('./line-item');

class ParcelLineItem {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return ParcelLineItems;
  }

  static get tableName() {
    return 'parcel_line_item';
  }

  static get sqlColumnsData() {
    return [
      'id',
      { column: 'parcel_id', references: Parcel },
      { column: 'line_item_id', references: LineItem }
    ];
  }
}

module.exports = ParcelLineItem;
