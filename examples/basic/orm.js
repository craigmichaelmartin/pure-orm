const { create } = require('../../src');
const Article = require('./bo/article');
const Person = require('./bo/person');
const Tag = require('./bo/tag');
module.exports = create({
  getBusinessObjects: () => [Article, Person, Tag],
  db: void 0
});
