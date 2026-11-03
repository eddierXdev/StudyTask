'use strict';

const { sequelize } = require('../models');

async function checkDatabaseConnection() {
  try {
    await sequelize.authenticate();
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log(
      `SQLite database connection OK (${tables.length} table(s), storage: ${sequelize.options.storage})`
    );
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

checkDatabaseConnection();
