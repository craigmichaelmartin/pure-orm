const Members = require('./members');

class Member {
  constructor(props) {
    Object.assign(this, props);
  }

  get BoCollection() {
    return Members;
  }
  static get tableName() {
    return 'member';
  }

  static get sqlColumnsData() {
    return ['id'];
  }
}
module.exports = Member;
