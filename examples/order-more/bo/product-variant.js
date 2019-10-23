const Base = require('./base');
const ProductVariants = require('./product-variants');
const Product = require('./product');
const ActualProductVariant = require('./actual-product-variant');
const Color = require('./color');
const Gender = require('./gender');
const Size = require('./size');

class ProductVariant extends Base {
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
      { column: 'actual_product_variant_id', references: ActualProductVariant },
      { column: 'color_id', references: Color },
      { column: 'gender_id', references: Gender },
      { column: 'size_id', references: Size },
      'shopify_id',
      'image_url',
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
