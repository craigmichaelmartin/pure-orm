const BaseBo = require('./base');
const Orders = require('./orders');

class Order extends BaseBo {
  get BoCollection() {
    return Orders;
  }

  static get tableName() {
    return 'order';
  }

  static get sqlColumnsData() {
    return ['id', 'email'];
  }
}

module.exports = Order;
