/* eslint-disable global-require */
const getBusinessObjects = () => [
  // These need to be imported here to get around circular dependencies
  require('./bo/inventory-level'),
  require('./bo/actual-product-variant'),
  require('./bo/product-variant'),
  require('./bo/product-variant-image'),
  require('./bo/product'),
  require('./bo/size'),
  require('./bo/color'),
  require('./bo/gender'),
  require('./bo/shipment')
];

module.exports = getBusinessObjects;
