const Base = require('./base');
const Customers = require('./customers');

class Customer extends Base {

  get BoCollection() {
    return Customers;
  }

  static get tableName() {
    return 'customer';
  }

  static get sqlColumnsData() {
    return [
      'id',
      'email',
    ];  
  }
}

module.exports = Customer;
