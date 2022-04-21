const Brands = require('./brands');

class Brand {
  constructor(props) {
    Object.assign(this, props);
  }

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
