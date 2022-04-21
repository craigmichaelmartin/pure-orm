const Audiences = require('./audiences');

class Audience {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return Audiences;
  }

  static get tableName() {
    return 'audience';
  }

  static get sqlColumnsData() {
    return ['id'];
  }
}

module.exports = Audience;
