/* eslint-disable global-require */
const getBusinessObjects = () => [
  // These need to be imported here to get around circular dependencies
  require('./bo/member'),
  require('./bo/recommendation'),
  require('./bo/brand'),
  require('./bo/product'),
  require('./bo/category'),
  require('./bo/passion'),
  require('./bo/recommendation-audience'),
  require('./bo/audience')
];

module.exports = getBusinessObjects;
