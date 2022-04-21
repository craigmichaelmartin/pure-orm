const { create } = require('pure-orm');
const InventoryLevel = require('./business-objects/inventory-level');
const ActualProductVariant = require('./business-objects/actual-product-variant');
const ProductVariant = require('./business-objects/product-variant');
const ProductVariantImage = require('./business-objects/product-variant-image');
const Product = require('./business-objects/product');
const Size = require('./business-objects/size');
const Color = require('./business-objects/color');
const Gender = require('./business-objects/gender');
const Shipment = require('./business-objects/shipment');
const ShipmentActualProductVariant = require('./business-objects/shipment-actual-product-variant');
const Refund = require('./business-objects/refund');
const Order = require('./business-objects/order');
const LineItem = require('./business-objects/line-item');
const Customer = require('./business-objects/customer');
const PhysicalAddress = require('./business-objects/physical-address');
const UtmSource = require('./business-objects/utm-source');
const UtmMedium = require('./business-objects/utm-medium');
const ParcelLineItem = require('./business-objects/parcel-line-item');
const Parcel = require('./business-objects/parcel');
const ParcelEvent = require('./business-objects/parcel-event');
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
