const Customers = require('./customers');

class Customer {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return Customers;
  }

  static get tableName() {
    return 'customer';
  }

  static get sqlColumnsData() {
    return ['id', 'email'];
  }
}

module.exports = Customer;
