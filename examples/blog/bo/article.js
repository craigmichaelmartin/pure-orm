const Articles = require('./articles');
const Person = require('./person');

class Article {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return Articles;
  }

  static get tableName() {
    return 'article';
  }

  static get sqlColumnsData() {
    return [
      'id',
      { column: 'author_id', references: Person },
      'created_date',
      'read_time_minutes',
      'seo_description',
      'primary_image',
      'title',
      'slug',
      'body',
      'amp_body',
      'kind',
      'points'
    ];
  }
}

module.exports = Article;
