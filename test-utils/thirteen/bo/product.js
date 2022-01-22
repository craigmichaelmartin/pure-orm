const Base = require('./base');
const Brand = require('./brand');
const Products = require('./products');

class Product extends Base {
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
