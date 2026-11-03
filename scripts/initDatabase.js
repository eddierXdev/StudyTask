'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { resolveDatabaseStorage } = require('../config/databasePath');

function ensureDatabaseDirectory(storage) {
  if (storage === ':memory:') {
    return;
  }

  fs.mkdirSync(path.dirname(storage), { recursive: true });
}

function runMigrations() {
  const cliPath = require.resolve('sequelize-cli/lib/sequelize');

  execFileSync(process.execPath, [cliPath, 'db:migrate'], {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
}

function main() {
  const storage = resolveDatabaseStorage();
  ensureDatabaseDirectory(storage);
  runMigrations();
  console.log(`SQLite database initialized at ${storage}`);
}

try {
  main();
} catch (error) {
  console.error(`Database initialization failed: ${error.message}`);
  process.exitCode = 1;
}
