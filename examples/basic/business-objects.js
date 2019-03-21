/* eslint-disable global-require */
const getBusinessObjects = () => [
  // These need to be imported here to get around circular dependencies
  require('./bo/article'),
  require('./bo/person'),
  require('./bo/tag')
];

module.exports = getBusinessObjects;
