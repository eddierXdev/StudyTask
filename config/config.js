const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.join(__dirname, '..', '.env'),
  quiet: true,
});

const databaseUrl = process.env.DATABASE_URL;

if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
  throw new Error('Missing required environment variable: DATABASE_URL');
}

const baseConfig = {
  dialect: 'postgres',
  url: databaseUrl.trim(),
  logging: false,
};

module.exports = {
  development: baseConfig,
  test: baseConfig,
  production: baseConfig,
};
