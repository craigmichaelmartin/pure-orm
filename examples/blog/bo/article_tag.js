const Base = require('./base');
const ArticleTags = require('./article_tags');
const Article = require('./article');
const Tag = require('./tag');

class ArticleTag extends Base {
  get BoCollection() {
    return ArticleTags;
  }

  static get tableName() {
    return 'article_tag';
  }

  static get sqlColumnsData() {
    return [
      'id',
      { column: 'article_id', references: Article },
      { column: 'tag_id', references: Tag }
    ];
  }
}

module.exports = ArticleTag;
