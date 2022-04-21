const Brand = require('./brand');
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
    return ['id', { column: 'brand_id', references: Brand }];
  }
}

module.exports = Product;
