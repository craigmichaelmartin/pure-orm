const { create } = require('../../src');
const Article = require('./business-objects/article');
const Person = require('./business-objects/person');
const Tag = require('./business-objects/tag');
module.exports = create({
  getBusinessObjects: () => [Article, Person, Tag],
  db: void 0
});
