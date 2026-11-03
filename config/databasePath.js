'use strict';

const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.join(__dirname, '..', '.env'),
  quiet: true,
});

const DEFAULT_DATABASE_STORAGE = 'data/studytask.db';

function resolveDatabaseStorage() {
  const configuredStorage = process.env.DATABASE_STORAGE;

  if (typeof configuredStorage !== 'string' || configuredStorage.trim() === '') {
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
  resolveDatabaseStorage,
};
