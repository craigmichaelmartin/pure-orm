const ProductVariantImages = require('./product-variant-images');
const ProductVariant = require('./product-variant');

class ProductVariantImage {
  constructor(props) {
    Object.assign(this, props);
  }

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
