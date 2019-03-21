/* eslint-disable global-require */
const getTableData = () => [
  // These need to be imported here to get around circular dependencies
  require('./bo/article'),
  require('./bo/person'),
  require('./bo/article_tag'),
  require('./bo/tag')
];

module.exports = getTableData;
