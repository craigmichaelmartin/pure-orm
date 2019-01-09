const { createBaseBO } = require('sql-toolkit');
const getTableData = require('../table-data');

const constructor = createBaseBO({ getTableData });
module.exports = constructor;
