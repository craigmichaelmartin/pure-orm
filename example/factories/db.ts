import pgPromise from 'pg-promise';

const pgp = pgPromise();
const connectionObject = {
  host: process.env.DB_HOSTNAME,
  port: process.env.DB_PORT ? +process.env.DB_PORT : void 0,
  database: process.env.DB_NAME,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD
};
export const db = pgp(connectionObject);
