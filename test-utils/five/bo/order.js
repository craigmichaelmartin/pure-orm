const Orders = require('./orders');

class Order {
  constructor(props) {
    Object.assign(this, props);
  }

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
