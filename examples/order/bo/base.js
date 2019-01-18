const { createBaseBO } = require('../../../src/index');
const getTableData = require('../table-data');

const constructor = createBaseBO({ getTableData });
module.exports = constructor;
