const Base = require('./base');
const Brands = require('./brands');

class Brand extends Base {
  get BoCollection() {
    return Brands;
  }

  static get tableName() {
    return 'brand';
  }

  static get sqlColumnsData() {
    return ['id'];
  }
}

module.exports = Brand;
