const ArticleTags = require('./article_tags');
const Article = require('./article');
const Tag = require('./tag');

class ArticleTag {
  constructor(props) {
    Object.assign(this, props);
  }

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
