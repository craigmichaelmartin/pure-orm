const { create } = require('pure-orm');
const Article = require('./bo/article');
const Person = require('./bo/person');
const ArticleTag = require('./bo/article_tag');
const Tag = require('./bo/tag');

const getBusinessObjects = () => [
  Article,
  Person,
  ArticleTag,
  Tag,
];
const orm = create({
  getBusinessObjects: () => [
    Article,
    Person,
    ArticleTag,
    Tag,
  ],
  db: void 0,
});

module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
