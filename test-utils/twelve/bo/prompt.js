const Base = require('./base');
const Prompts = require('./prompts');
const Member = require('./member');

class Prompt extends Base {
  get BoCollection() {
    return Prompts;
  }
  static get tableName() {
    return 'prompt';
  }
  static get sqlColumnsData() {
    return [
      'id',
      { column: 'for_member_id', references: Member },
      { column: 'from_member_id', references: Member }
    ];
  }
}
module.exports = Prompt;
