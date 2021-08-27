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
  require('./bo/shipment'),
  require('./bo/shipment-actual-product-variant'),
  require('./bo/refund'),
  require('./bo/order'),
  require('./bo/line-item'),
  require('./bo/customer'),
  require('./bo/physical-address'),
  require('./bo/utm-source'),
  require('./bo/utm-medium'),
  require('./bo/parcel-line-item'),
  require('./bo/parcel'),
  require('./bo/parcel-event')
];

module.exports = getBusinessObjects;
