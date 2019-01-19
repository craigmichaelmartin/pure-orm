const Base = require('./base');

class Tag extends Base {
  get Bo() {
    return Tag;
  }

  static get tableName() {
    return 'tag';
  }

  static get sqlColumnsData() {
    return ['id', 'name', 'slug'];
  }
}

module.exports = Tag;
