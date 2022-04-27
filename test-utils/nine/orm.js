const { create } = require('../../src/index');
const FeatureSwitch = require('./business-objects/feature-switch');
const getBusinessObjects = () => [FeatureSwitch];
const orm = create({
  getBusinessObjects,
  db: void 0
});
module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
