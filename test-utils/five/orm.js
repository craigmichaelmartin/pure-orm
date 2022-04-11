const { create } = require('pure-orm');
const Order = require('./bo/order');
const LineItem = require('./bo/line-item');
const ParcelLineItem = require('./bo/parcel-line-item');
const Parcel = require('./bo/parcel');
const ParcelEvent = require('./bo/parcel-event');
const getBusinessObjects = () => [
  Order,
  LineItem,
  ParcelLineItem,
  Parcel,
  ParcelEvent,
];
const orm = create({
  getBusinessObjects,
  db: void 0,
});
module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
