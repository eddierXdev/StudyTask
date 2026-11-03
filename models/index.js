const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

const User = require('./User')(sequelize);
const Task = require('./Task')(sequelize);

User.associate({ Task });
Task.associate({ User });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Task,
};
