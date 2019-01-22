/* eslint-disable global-require */
const getTableData = () => {
  // These need to be imported here to get around circular dependencies
  var Article = require('./bo/article');
  var Person = require('./bo/person');
  var Tag = require('./bo/tag');

  const tableMap = {
    article: Article,
    person: Person,
    tag: Tag
  };

  return {
    tableMap
  };
};

module.exports = getTableData;
