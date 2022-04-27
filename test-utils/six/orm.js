const { create } = require('../../src/index');
const Parcel = require('./business-objects/parcel');
const ParcelLineItem = require('./business-objects/parcel-line-item');
const LineItem = require('./business-objects/line-item');
const Order = require('./business-objects/order');
const Customer = require('./business-objects/customer');
const getBusinessObjects = () => [
  Parcel,
  ParcelLineItem,
  LineItem,
  Order,
  Customer
];
const orm = create({
  getBusinessObjects,
  db: void 0
});
module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
