const { create } = require('pure-orm');
const UtmSource = require('./bo/utm-source');
const Order = require('./bo/order');
const LineItem = require('./bo/line-item');
const ProductVariant = require('./bo/product-variant');
const Product = require('./bo/product');

const getBusinessObjects = () => [
  UtmSource,
  Order,
  LineItem,
  ProductVariant,
  Product
];
const orm = create({
  getBusinessObjects,
  db: void 0
});
module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
