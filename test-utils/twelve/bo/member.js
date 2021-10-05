const Base = require('./base');
const Members = require('./members');

class Member extends Base {
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
