const { create } = require('../../src/index');
const { articleConfiguration } = require('./business-objects/article');
const { personConfiguration } = require('./business-objects/person');
const { articleTagConfiguration } = require('./business-objects/article_tag');
const { tagConfiguration } = require('./business-objects/tag');

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
