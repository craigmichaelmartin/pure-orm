/* eslint-disable global-require */
const getTableData = () => {
  // These need to be imported here to get around circular dependencies
  const UtmSource = require('./bo/utm-source');
  const Order = require('./bo/order');
  const Orders = require('./bo/orders');
  const LineItem = require('./bo/line-item');
  const LineItems = require('./bo/line-items');
  const ProductVariant = require('./bo/product-variant');
  const ProductVariants = require('./bo/product-variants');
  const Product = require('./bo/product');
  const Products = require('./bo/products');

  return {
    tableMap: {
      utm_source: UtmSource,
      order: Order,
      line_item: LineItem,
      product_variant: ProductVariant,
      product: Product
    },
    collectionsMap: {
      orders: Orders,
      lineItems: LineItems,
      productVariants: ProductVariants,
      products: Products
    },
    singleToCollection: {
      order: Orders,
      lineItem: LineItems,
      productVariant: ProductVariants,
      product: Products
    }
  };
};

module.exports = getTableData;
