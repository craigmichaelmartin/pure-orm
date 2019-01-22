/* eslint-disable global-require */
const getTableData = () => {
  // These need to be imported here to get around circular dependencies
  const UtmSource = require('./bo/utm-source');
  const Order = require('./bo/order');
  const LineItem = require('./bo/line-item');
  const ProductVariant = require('./bo/product-variant');
  const Product = require('./bo/product');

  return {
    tableMap: {
      utm_source: UtmSource,
      order: Order,
      line_item: LineItem,
      product_variant: ProductVariant,
      product: Product
    }
  };
};

module.exports = getTableData;
