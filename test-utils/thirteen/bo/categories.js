class Categories {
  static get Bo() {
    return require('./category'); // eslint-disable-line
  }
  static get displayName() {
    return 'categories';
  }
  constructor(props = {}) {
    this.models = props.models || [];
  }
}

module.exports = Categories;
