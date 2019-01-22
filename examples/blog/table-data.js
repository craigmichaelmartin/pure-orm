/* eslint-disable global-require */
const getTableData = () => {
  // These need to be imported here to get around circular dependencies
  const Article = require('./bo/article');
  const Person = require('./bo/person');
  const ArticleTag = require('./bo/article_tag');
  const Tag = require('./bo/tag');

  return {
    tableMap: {
      article: Article,
      person: Person,
      article_tag: ArticleTag,
      tag: Tag
    }
  };
};

module.exports = getTableData;
