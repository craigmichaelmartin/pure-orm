const Products = require('./products');

class Product {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return Products;
  }

  static get tableName() {
    return 'product';
  }

  static get sqlColumnsData() {
    return [
      'id',
      'vendor_id',
      'value',
      'label',
      'product_type',
      'created_date',
      'updated_date',
      'published_date',
      'category'
    ];
  }
}

module.exports = Product;
