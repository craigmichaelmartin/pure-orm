class Tag {

  constructor(props) {
    Object.assign(this, props);
  }

  static get tableName() {
    return 'tag';
  }

  static get sqlColumnsData() {
    return ['id', 'name', 'slug'];
  }
}

module.exports = Tag;
