const { create } = require('../../src/index');
const Order = require('./business-objects/order');
const LineItem = require('./business-objects/line-item');
const ParcelLineItem = require('./business-objects/parcel-line-item');
const Parcel = require('./business-objects/parcel');
const ParcelEvent = require('./business-objects/parcel-event');
const getBusinessObjects = () => [
  Order,
  LineItem,
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
