/* eslint-disable global-require */
const getBusinessObjects = () => [
  // These need to be imported here to get around circular dependencies
  require('./bo/parcel'),
  require('./bo/parcel-line-item'),
  require('./bo/line-item'),
  require('./bo/order'),
  require('./bo/customer')
];

module.exports = getBusinessObjects;
