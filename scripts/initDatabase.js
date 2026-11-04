'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { resolveDatabaseStorage } = require('../config/databasePath');

const PROJECT_ROOT = path.join(__dirname, '..');

function ensureDatabaseDirectory(storage) {
  if (storage === ':memory:') {
    return;
  }

  fs.mkdirSync(path.dirname(storage), { recursive: true });
}

function runMigrations() {
  const cliPath = require.resolve('sequelize-cli/lib/sequelize');

  execFileSync(
    process.execPath,
    [
      cliPath,
      'db:migrate',
      '--config',
      path.join(PROJECT_ROOT, 'config', 'config.js'),
      '--migrations-path',
      path.join(PROJECT_ROOT, 'migrations'),
    ],
    {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: 'inherit',
    }
  );
}

function initializeDatabase() {
  const storage = resolveDatabaseStorage();
  ensureDatabaseDirectory(storage);
  runMigrations();
  console.log(`SQLite database initialized at ${storage}`);
  return storage;
}

if (require.main === module) {
  try {
    initializeDatabase();
  } catch (error) {
    console.error(`Database initialization failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { initializeDatabase };
