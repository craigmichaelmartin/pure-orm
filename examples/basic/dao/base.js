const { createBaseDAO } = require('pure-orm');
const getTableData = require('../table-data');
const db = require('../db');

const logError = console.log.bind(console);

const constructor = createBaseDAO({ getTableData, db, logError });

module.exports = constructor;
