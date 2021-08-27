/* eslint-disable global-require */
const getBusinessObjects = () => [
  // These need to be imported here to get around circular dependencies
  require('./bo/feature-switch')
];

module.exports = getBusinessObjects;
