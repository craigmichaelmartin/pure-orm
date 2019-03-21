const { createBaseBO } = require('sql-toolkit');
const getBusinessObjects = require('../business-objects');

const constructor = createBaseBO({ getBusinessObjects });
module.exports = constructor;
