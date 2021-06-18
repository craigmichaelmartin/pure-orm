const Base = require('./base');
const Order = require('./order');
const LineItems = require('./customers');

class LineItem extends Base {

  get BoCollection() {
    return LineItems;
  }

  static get tableName() {
    return 'line_item';
  }

  static get sqlColumnsData() {
    return [
      'id',
      { column: 'order_id', references: Order },
    ];  
  }
}

module.exports = LineItem;
