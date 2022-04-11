const Categories = require('./categories');

class Category {
  constructor(props) {
    Object.assign(this, props);
  }

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
