const { create } = require('../../src/index');
const { articleConfiguration } = require('./models/article');
const { personConfiguration } = require('./models/person');
const { articleTagConfiguration } = require('./models/article_tag');
const { tagConfiguration } = require('./models/tag');

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
