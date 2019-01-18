const Base = require('./base');
const ProductVariants = require('./product-variants');
const Product = require('./product');

class ProductVariant extends Base {
  get Bo() {
    return ProductVariant;
  }

  get BoCollection() {
    return ProductVariants;
  }

  static get tableName() {
    return 'product_variant';
  }

  static get sqlColumnsData() {
    return [
      'id',
      { column: 'product_id', references: Product },
      'actual_product_variant_id',
      'color_id',
      'gender_id',
      'size_id',
      'barcode',
      'price',
      'compare_at_price',
      'created_date',
      'updated_date',
      'grams',
      'requires_shipping'
    ];
  }
}

module.exports = ProductVariant;
