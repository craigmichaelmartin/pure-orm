const { BaseBoCollection } = require('../../../src/index');

class ArticleTags extends BaseBoCollection {
  static get Bo() {
    return require('./article_tag'); // eslint-disable-line
  }
}

module.exports = ArticleTags;
