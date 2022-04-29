const { create } = require('../../src/index');
const { articleConfiguration } = require('./entities/article');
const { personConfiguration } = require('./entities/person');
const { articleTagConfiguration } = require('./entities/article_tag');
const { tagConfiguration } = require('./entities/tag');

const orm = create({
  getPureORMDataArray: () => [
    articleConfiguration,
    personConfiguration,
    articleTagConfiguration,
    tagConfiguration,
  ],
  db: void 0
});
export default orm;
