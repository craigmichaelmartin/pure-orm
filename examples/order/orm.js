const { create } = require('../../src/index');
const UtmSource = require('./business-objects/utm-source');
const Order = require('./business-objects/order');
const LineItem = require('./business-objects/line-item');
const ProductVariant = require('./business-objects/product-variant');
const Product = require('./business-objects/product');

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
