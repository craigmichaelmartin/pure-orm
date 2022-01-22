const Base = require('./base');
const Categories = require('./categories');

class Category extends Base {
  get BoCollection() {
    return Categories;
  }

  static get tableName() {
    return 'category';
  }

  static get sqlColumnsData() {
    return ['id'];
  }
}

module.exports = Category;
