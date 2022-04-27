const { create } = require('../../src/index');
const Prompt = require('./business-objects/prompt');
const Member = require('./business-objects/member');
const getBusinessObjects = () => [Prompt, Member];
const orm = create({
  getBusinessObjects,
  db: void 0
});
module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
