const Prompts = require('./prompts');
const Member = require('./member');

class Prompt {
  constructor(props) {
    Object.assign(this, props);
  }

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
