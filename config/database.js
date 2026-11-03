const { Sequelize } = require('sequelize');
const environment = require('./environment');

const sequelize = new Sequelize(environment.databaseUrl, {
  dialect: 'postgres',
  logging: false,
  define: {
    underscored: true,
    freezeTableName: true,
  },
});

module.exports = sequelize;
