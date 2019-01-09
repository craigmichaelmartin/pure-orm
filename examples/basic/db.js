const pgPromise = require('pg-promise');
const {
  rdsDbName,
  rdsHostname,
  rdsPassword,
  rdsPort,
  rdsUsername,
  debugMode
} = require('./secret-stuffz');

const options = {
  ...(debugMode && { query: e => console.log(e.query) })
};

const pgp = pgPromise(options);
const connectionObject = {
  host: rdsHostname,
  port: rdsPort,
  database: rdsDbName,
  user: rdsUsername,
  password: rdsPassword
};
const db = pgp(connectionObject);

module.exports = db;
