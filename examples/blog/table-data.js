/* eslint-disable global-require */
const getTableData = () => {
  // These need to be imported here to get around circular dependencies
  const Article = require('./bo/article');
  const Articles = require('./bo/articles');
  const Person = require('./bo/person');
  const ArticleTag = require('./bo/article_tag');
  const ArticleTags = require('./bo/article_tags');
  const Tag = require('./bo/tag');

  return {
    tableMap: {
      article: Article,
      person: Person,
      article_tag: ArticleTag,
      tag: Tag
    },
    collectionsMap: {
      articles: Articles,
      articleTags: ArticleTags
    },
    singleToCollection: {
      article: Articles,
      articleTag: ArticleTags
    }
  };
};

module.exports = getTableData;
