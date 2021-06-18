const { createBaseBO } = require('pure-orm');
const getBusinessObjects = require('../business-objects');

const constructor = createBaseBO({ getBusinessObjects });
module.exports = constructor;
