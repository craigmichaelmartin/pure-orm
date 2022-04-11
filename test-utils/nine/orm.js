const { create } = require('pure-orm');
const FeatureSwitch = require('./bo/feature-switch');
const getBusinessObjects = () => [
  FeatureSwitch,
];
const orm = create({
  getBusinessObjects,
  db: void 0,
});
module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
