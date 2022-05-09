const { articleEntity } = require('./models/article');
const { personEntity } = require('./models/person');
const { articleTagEntity } = require('./models/article_tag');
const { tagEntity } = require('./models/tag');

export const entities = [
  articleEntity,
  personEntity,
  articleTagEntity,
  tagEntity
];
