'use strict';

const { Writable } = require('node:stream');
const readline = require('node:readline/promises');

const adminService = require('../services/adminService');
const { sequelize } = require('../models');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class AdminScriptError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AdminScriptError';
  }
}

function validateName(name) {
  const normalizedName = String(name || '').trim();

  if (normalizedName.length === 0) {
    throw new AdminScriptError('El nombre es obligatorio.');
  }

  if (normalizedName.length > 100) {
    throw new AdminScriptError('El nombre no puede superar los 100 caracteres.');
  }

  return normalizedName;
}

function validateEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (normalizedEmail.length === 0) {
    throw new AdminScriptError('El correo electrónico es obligatorio.');
  }

  if (normalizedEmail.length > 255) {
    throw new AdminScriptError('El correo no puede superar los 255 caracteres.');
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new AdminScriptError('Introduce un correo electrónico válido.');
  }

  return normalizedEmail;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new AdminScriptError(
      'La contraseña debe tener al menos 8 caracteres.'
    );
  }

  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new AdminScriptError(
      'La contraseña no puede superar los 72 bytes.'
    );
  }

  return password;
}

function readEnvironmentInput() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const providedValues = [name, email, password].filter(
    (value) => typeof value === 'string' && value !== ''
  );

  if (providedValues.length === 0) {
    return null;
  }

  if (providedValues.length !== 3) {
    throw new AdminScriptError(
      'Define ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD juntos, o no definas ninguno.'
    );
  }

  return { name, email, password };
}

async function promptForInput() {
  if (!process.stdin.isTTY) {
    throw new AdminScriptError(
      'Este script requiere una terminal interactiva. Para ejecución no interactiva, define ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD.'
    );
  }

  let muted = false;

  const filteredOutput = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) {
        process.stdout.write(chunk);
      }

      callback();
    },
  });

  filteredOutput.columns = process.stdout.columns;
  filteredOutput.rows = process.stdout.rows;
  filteredOutput.isTTY = process.stdout.isTTY;

  const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: filteredOutput,
    terminal: process.stdin.isTTY,
  });

  async function ask(question, hidden = false) {
    if (hidden) {
      process.stdout.write(question);
      muted = true;
    }

    try {
      return await readlineInterface.question(hidden ? '' : question);
    } finally {
      if (hidden) {
        muted = false;
        process.stdout.write('\n');
      }
    }
  }

  try {
    const name = await ask('Nombre del administrador: ');
    const email = await ask('Correo electrónico: ');
    const password = await ask('Contraseña: ', true);
    const passwordConfirmation = await ask('Confirma la contraseña: ', true);

    if (password !== passwordConfirmation) {
      throw new AdminScriptError('Las contraseñas no coinciden.');
    }

    return { name, email, password };
  } finally {
    readlineInterface.close();
  }
}

async function main() {
  try {
    const input = readEnvironmentInput() || (await promptForInput());
    const name = validateName(input.name);
    const email = validateEmail(input.email);
    const password = validatePassword(input.password);

    const admin = await adminService.createAdminUser({
      name,
      email,
      password,
    });

    console.log(
      `Administrador creado correctamente: ${admin.name} <${admin.email}>`
    );
  } catch (error) {
    if (error instanceof AdminScriptError) {
      console.error(`Error: ${error.message}`);
    } else if (
      error instanceof adminService.AdminServiceError &&
      error.code === 'EMAIL_EXISTS'
    ) {
      console.error(
        'Error: ya existe una cuenta con ese correo electrónico. No se modificó su rol.'
      );
    } else if (error.name === 'SequelizeValidationError') {
      console.error(
        'Error: los datos no cumplen las validaciones de la base de datos.'
      );
    } else {
      console.error(
        'Error: no se pudo crear el administrador. Revisa la configuración y la base de datos SQLite.'
      );
    }

    process.exitCode = 1;
  } finally {
    try {
      await sequelize.close();
    } catch (error) {
      // The process is already ending; do not expose connection details.
    }
  }
}

main();
