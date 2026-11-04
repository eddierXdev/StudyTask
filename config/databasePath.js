'use strict';

const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.join(__dirname, '..', '.env'),
  quiet: true,
});

const DEFAULT_DATABASE_STORAGE = 'data/studytask.db';
const VERCEL_DATABASE_STORAGE = '/tmp/studytask.db';

function resolveDatabaseStorage() {
  const configuredStorage = process.env.DATABASE_STORAGE;

  if (typeof configuredStorage !== 'string' || configuredStorage.trim() === '') {
    // Vercel Functions can only write to /tmp. Keep the local default for every
    // other environment so development and tests are unaffected.
    if (process.env.VERCEL) {
      return VERCEL_DATABASE_STORAGE;
    }

    return path.resolve(__dirname, '..', DEFAULT_DATABASE_STORAGE);
  }

  const normalizedStorage = configuredStorage.trim();

  if (normalizedStorage === ':memory:') {
    return normalizedStorage;
  }

  return path.resolve(__dirname, '..', normalizedStorage);
}

module.exports = {
  DEFAULT_DATABASE_STORAGE,
  VERCEL_DATABASE_STORAGE,
  resolveDatabaseStorage,
};
