const ActualProductVariants = require('./actual-product-variants');

class ActualProductVariant {
  constructor(props) {
    Object.assign(this, props);
  }

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
