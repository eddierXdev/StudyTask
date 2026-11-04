'use strict';

const adminService = require('../services/adminService');
const { sequelize, User } = require('../models');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class BootstrapAdminError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BootstrapAdminError';
  }
}

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function readAdminConfig() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const providedValues = [name, email, password].filter(
    (value) => typeof value === 'string' && value.trim() !== ''
  );

  if (providedValues.length === 0) {
    return null;
  }

  if (providedValues.length !== 3) {
    throw new BootstrapAdminError(
      'ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be defined together.'
    );
  }

  const normalizedName = String(name).trim();
  const normalizedEmail = normalizeEmail(email);

  if (normalizedName.length === 0 || normalizedName.length > 100) {
    throw new BootstrapAdminError('ADMIN_NAME must contain between 1 and 100 characters.');
  }

  if (
    normalizedEmail.length === 0 ||
    normalizedEmail.length > 255 ||
    !EMAIL_PATTERN.test(normalizedEmail)
  ) {
    throw new BootstrapAdminError('ADMIN_EMAIL must be a valid email address.');
  }

  if (typeof password !== 'string' || password.length < 8) {
    throw new BootstrapAdminError('ADMIN_PASSWORD must have at least 8 characters.');
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new BootstrapAdminError('ADMIN_PASSWORD must not exceed 72 bytes.');
  }

  return {
    name: normalizedName,
    email: normalizedEmail,
    password,
  };
}

async function bootstrapAdmin() {
  const adminConfig = readAdminConfig();

  if (!adminConfig) {
    return;
  }

  const existingUser = await User.findOne({
    where: { email: adminConfig.email },
  });

  if (existingUser) {
    if (existingUser.role === 'admin') {
      console.log('Bootstrap administrator already exists.');
    } else {
      console.warn(
        'Bootstrap administrator skipped: the configured email belongs to a non-admin account.'
      );
    }

    return;
  }

  await adminService.createAdminUser(adminConfig);
  console.log('Bootstrap administrator created.');
}

async function runCli() {
  try {
    await bootstrapAdmin();
  } catch (error) {
    if (error instanceof BootstrapAdminError) {
      console.error(`Bootstrap administrator error: ${error.message}`);
    } else {
      console.error('Bootstrap administrator error: could not create the account.');
    }

    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch (error) {
      // The process is ending; do not expose connection details.
    }
  }
}

if (require.main === module) {
  runCli();
}

module.exports = { bootstrapAdmin };
