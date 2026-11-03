const { resolveDatabaseStorage } = require('./databasePath');

const baseConfig = {
  dialect: 'sqlite',
  storage: resolveDatabaseStorage(),
  logging: false,
};

module.exports = {
  development: baseConfig,
  test: baseConfig,
  production: baseConfig,
};
