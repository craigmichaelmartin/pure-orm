/* eslint-disable global-require */
const getBusinessObjects = () => [
  // These need to be imported here to get around circular dependencies
  require('./bo/utm-source'),
  require('./bo/order'),
  require('./bo/line-item'),
  require('./bo/product-variant'),
  require('./bo/product')
];

module.exports = getBusinessObjects;
