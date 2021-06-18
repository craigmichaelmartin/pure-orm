const Base = require('./base');
const Customer = require('./customer');
const Orders = require('./orders');

class Order extends Base {
  get BoCollection() {
    return Orders;
  }

  static get tableName() {
    return 'order';
  }

  static get sqlColumnsData() {
    return ['id', { column: 'customer_id', references: Customer }];
  }
}

module.exports = Order;
