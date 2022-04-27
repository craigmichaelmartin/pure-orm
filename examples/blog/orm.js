const { create } = require('../../src/index');
const Article = require('./business-objects/article');
const Person = require('./business-objects/person');
const ArticleTag = require('./business-objects/article_tag');
const Tag = require('./business-objects/tag');

const getBusinessObjects = () => [Article, Person, ArticleTag, Tag];
const orm = create({
  getBusinessObjects: () => [Article, Person, ArticleTag, Tag],
  db: void 0
});

module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
