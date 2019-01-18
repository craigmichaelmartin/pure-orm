const Base = require('./base');
const LineItems = require('./line-items');
const ProductVariant = require('./product-variant');
const Order = require('./order');

class LineItem extends Base {
  get Bo() {
    return LineItem;
  }

  get BoCollection() {
    return LineItems;
  }

  static get tableName() {
    return 'line_item';
  }

  static get sqlColumnsData() {
    return [
      'id',
      { column: 'product_variant_id', references: ProductVariant },
      { column: 'order_id', references: Order },
      'fulfillable_quantity',
      'fulfillment_service',
      'grams',
      'price',
      'quantity',
      'requires_shipping',
      'taxable',
      'total_discount'
    ];
  }
}

module.exports = LineItem;
