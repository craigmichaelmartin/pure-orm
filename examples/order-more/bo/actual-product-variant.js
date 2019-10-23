const Base = require('./base');
const ActualProductVariants = require('./actual-product-variants');

class ActualProductVariant extends Base {
  get BoCollection() {
    return ActualProductVariants;
  }

  static get tableName() {
    return 'actual_product_variant';
  }

  static get sqlColumnsData() {
    return ['id', 'sku'];
  }

  serializeToClient() {
    return {
      id: this.id,
      sku: this.sku
    };
  }
}

module.exports = ActualProductVariant;
