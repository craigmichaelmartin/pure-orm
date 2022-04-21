const LineItems = require('./line-items');
const Order = require('./order');

class LineItem {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return LineItems;
  }

  static get tableName() {
    return 'line_item';
  }

  static get sqlColumnsData() {
    return ['id', { column: 'order_id', references: Order }];
  }
}

module.exports = LineItem;
