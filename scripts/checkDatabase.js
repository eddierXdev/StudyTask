'use strict';

const { sequelize } = require('../models');

async function checkDatabaseConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection OK');
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

checkDatabaseConnection();
