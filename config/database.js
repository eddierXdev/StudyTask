const { Sequelize } = require('sequelize');
const environment = require('./environment');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: environment.databaseStorage,
  logging: false,
  define: {
    underscored: true,
    freezeTableName: true,
  },
});

module.exports = sequelize;
