const Passions = require('./passions');

class Passion {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return Passions;
  }

  static get tableName() {
    return 'passion';
  }

  static get sqlColumnsData() {
    return ['id'];
  }
}

module.exports = Passion;
