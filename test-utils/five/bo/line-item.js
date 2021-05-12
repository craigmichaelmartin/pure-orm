const Base = require('./base');
const LineItems = require('./line-items');
const Order = require('./order');

class LineItem extends Base {
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
