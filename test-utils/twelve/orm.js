const { create } = require('pure-orm');
const Prompt = require('./business-objects/prompt');
const Member = require('./business-objects/member');
const getBusinessObjects = () => [Prompt, Member];
const orm = create({
  getBusinessObjects,
  db: void 0
});
module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
