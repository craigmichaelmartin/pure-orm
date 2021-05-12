/* eslint-disable global-require */
const getBusinessObjects = () => [
  // These need to be imported here to get around circular dependencies
  require('./bo/order'),
  require('./bo/line-item'),
  require('./bo/parcel-line-item'),
  require('./bo/parcel'),
  require('./bo/parcel-event')
];

module.exports = getBusinessObjects;
