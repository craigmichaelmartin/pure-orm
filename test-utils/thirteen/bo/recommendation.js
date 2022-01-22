const Base = require('./base');
const Recommendations = require('./recommendations');
const Member = require('./member');
const Brand = require('./brand');
const Product = require('./product');
const Category = require('./category');
const Passion = require('./passion');

class Recommendation extends Base {
  get BoCollection() {
    return Recommendations;
  }

  static get tableName() {
    return 'recommendation';
  }

  static get sqlColumnsData() {
    return [
      'id',
      { column: 'member_id', references: Member },
      { column: 'brand_id', references: Brand },
      { column: 'product_id', references: Product },
      { column: 'category_id', references: Category },
      { column: 'passion_id', references: Passion }
    ];
  }
}

module.exports = Recommendation;
