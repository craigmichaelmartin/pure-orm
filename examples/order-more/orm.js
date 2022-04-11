const { create } = require('pure-orm');
const InventoryLevel = require('./bo/inventory-level');
const ActualProductVariant = require('./bo/actual-product-variant');
const ProductVariant = require('./bo/product-variant');
const ProductVariantImage = require('./bo/product-variant-image');
const Product = require('./bo/product');
const Size = require('./bo/size');
const Color = require('./bo/color');
const Gender = require('./bo/gender');
const Shipment = require('./bo/shipment');
const ShipmentActualProductVariant = require('./bo/shipment-actual-product-variant');
const Refund = require('./bo/refund');
const Order = require('./bo/order');
const LineItem = require('./bo/line-item');
const Customer = require('./bo/customer');
const PhysicalAddress = require('./bo/physical-address');
const UtmSource = require('./bo/utm-source');
const UtmMedium = require('./bo/utm-medium');
const ParcelLineItem = require('./bo/parcel-line-item');
const Parcel = require('./bo/parcel');
const ParcelEvent = require('./bo/parcel-event');
const getBusinessObjects = () => [
  InventoryLevel,
  ActualProductVariant,
  ProductVariant,
  ProductVariantImage,
  Product,
  Size,
  Color,
  Gender,
  Shipment,
  ShipmentActualProductVariant,
  Refund,
  Order,
  LineItem,
  Customer,
  PhysicalAddress,
  UtmSource,
  UtmMedium,
  ParcelLineItem,
  Parcel,
  ParcelEvent
];
const orm = create({
  getBusinessObjects,
  db: void 0
});
module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
