const { create } = require('pure-orm');
const Parcel = require('./bo/parcel');
const ParcelLineItem = require('./bo/parcel-line-item');
const LineItem = require('./bo/line-item');
const Order = require('./bo/order');
const Customer = require('./bo/customer');
const getBusinessObjects = () => [
  Parcel,
  ParcelLineItem,
  LineItem,
  Order,
  Customer
];
const orm = create({
  getBusinessObjects,
  db: void 0,
});
module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
