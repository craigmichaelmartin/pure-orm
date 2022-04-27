const { createBaseBO } = require('../../src/index');
const getBusinessObjects = require('../business-objects');

const constructor = createBaseBO({ getBusinessObjects });
module.exports = constructor;
