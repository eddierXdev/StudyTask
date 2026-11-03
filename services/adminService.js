'use strict';

const bcrypt = require('bcrypt');
const { UniqueConstraintError } = require('sequelize');

const environment = require('../config/environment');
const { sequelize, Task, User } = require('../models');

class AdminServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AdminServiceError';
    this.code = code;
  }
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

async function createAdminUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, environment.bcryptRounds);

  try {
    const user = await User.create({
      name: name.trim(),
      email: normalizeEmail(email),
      password: passwordHash,
      role: 'admin',
    });

    return user.toJSON();
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new AdminServiceError(
        'EMAIL_EXISTS',
        'An account with this email already exists.'
      );
    }

    throw error;
  }
}

async function listAllTasks() {
  return Task.findAll({
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'name', 'email'],
      },
    ],
    order: [
      ['dueDate', 'ASC'],
      [sequelize.col('Task.created_at'), 'DESC'],
    ],
  });
}

async function findTaskById(taskId) {
  return Task.findOne({
    where: { id: taskId },
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'name', 'email'],
      },
    ],
  });
}

async function deleteTaskById(taskId) {
  return Task.destroy({
    where: { id: taskId },
  });
}

async function listUsers() {
  return User.findAll({
    attributes: ['id', 'name', 'email', 'role', 'created_at'],
    order: [['id', 'ASC']],
  });
}

module.exports = {
  AdminServiceError,
  createAdminUser,
  listAllTasks,
  findTaskById,
  deleteTaskById,
  listUsers,
};
