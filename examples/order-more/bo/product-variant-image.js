const Base = require('./base');
const ProductVariantImages = require('./product-variant-images');
const ProductVariant = require('./product-variant');

class ProductVariantImage extends Base {
  get BoCollection() {
    return ProductVariantImages;
  }

  static get tableName() {
    return 'product_variant_image';
  }

  static get sqlColumnsData() {
    return [
      'id',
      { column: 'product_variant_id', references: ProductVariant },
      'image_url_full',
      'image_url_preview',
      'is_primary'
    ];
  }
}

module.exports = ProductVariantImage;
