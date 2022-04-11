const ParcelLineItems = require('./parcel-line-items');
const LineItem = require('./line-item');
const Parcel = require('./parcel');

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
      { column: 'line_item_id', references: LineItem },
      { column: 'parcel_id', references: Parcel }
    ];
  }
}

module.exports = ParcelLineItem;
