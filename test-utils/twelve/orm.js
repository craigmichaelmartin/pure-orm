const { create } = require('pure-orm');
const Prompt = require('./bo/prompt');
const Member = require('./bo/member');
const getBusinessObjects = () => [Prompt, Member];
const orm = create({
  getBusinessObjects,
  db: void 0
});
module.exports = orm;
module.exports.getBusinessObjects = getBusinessObjects;
