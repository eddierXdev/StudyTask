'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { UniqueConstraintError } = require('sequelize');

const environment = require('../config/environment');
const { User } = require('../models');

class AuthServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
  }
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function createToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
    },
    environment.jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: environment.jwtExpiresIn,
    }
  );
}

function verifyToken(token) {
  return jwt.verify(token, environment.jwtSecret, {
    algorithms: ['HS256'],
  });
}

async function registerUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, environment.bcryptRounds);

  try {
    const user = await User.create({
      name: name.trim(),
      email: normalizeEmail(email),
      password: passwordHash,
      role: 'user',
    });

    return user.toJSON();
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new AuthServiceError(
        'EMAIL_EXISTS',
        'An account with this email already exists.'
      );
    }

    throw error;
  }
}

async function loginUser({ email, password }) {
  const user = await User.scope('withPassword').findOne({
    where: {
      email: normalizeEmail(email),
    },
  });

  if (!user) {
    throw new AuthServiceError(
      'INVALID_CREDENTIALS',
      'Invalid email or password.'
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new AuthServiceError(
      'INVALID_CREDENTIALS',
      'Invalid email or password.'
    );
  }

  return {
    user: user.toJSON(),
    token: createToken(user),
  };
}

module.exports = {
  AuthServiceError,
  registerUser,
  loginUser,
  createToken,
  verifyToken,
};
