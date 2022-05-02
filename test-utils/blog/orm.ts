const { create } = require('../../src/index');
const { articleEntity } = require('./models/article');
const { personEntity } = require('./models/person');
const { articleTagEntity } = require('./models/article_tag');
const { tagEntity } = require('./models/tag');

const orm = create({
  getEntities: () => [articleEntity, personEntity, articleTagEntity, tagEntity],
  db: void 0
});
export default orm;
