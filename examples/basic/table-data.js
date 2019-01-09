/* eslint-disable global-require */
const getTableData = () => {
  // These need to be imported here to get around circular dependencies
  var Article = require('./bo/article');
  var Person = require('./bo/person');
  var Tag = require('./bo/tag');
  var Tags = require('./bo/tags');

  const tableMap = {
    article: Article,
    person: Person,
    tag: Tag
  };

  const collectionsMap = {
    tags: Tags
  };

  const singleToCollection = {
    tag: Tags
  };

  return {
    tableMap,
    collectionsMap,
    singleToCollection
  };
};

module.exports = getTableData;
