const pgPromise = require('pg-promise');
const options = {
  ...(process.env.DEBUG && { query: (e: any) => console.log(e.query) })
};

const pgp = pgPromise(options);
const connectionObject = {
  host: process.env.DB_HOSTNAME,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD
};
const db = pgp(connectionObject);

module.exports = db;
