const path = require('node:path');
const dotenv = require('dotenv');
const { resolveDatabaseStorage } = require('./databasePath');

dotenv.config({
  path: path.join(__dirname, '..', '.env'),
  quiet: true,
});

const requiredVariables = [
  'NODE_ENV',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'COOKIE_NAME',
  'CSRF_SECRET',
];

function readRequiredVariable(name) {
  const value = process.env[name];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

const values = Object.fromEntries(
  requiredVariables.map((name) => [name, readRequiredVariable(name)])
);

const nodeEnv = values.NODE_ENV;

if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be one of: development, test, production');
}

// Vercel does not provide PORT because the platform manages the listener.
const port = Number(process.env.PORT || '3000');

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const databaseStorage = resolveDatabaseStorage();

const jwtSecret = values.JWT_SECRET;

if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

const csrfSecret = values.CSRF_SECRET;

if (csrfSecret.length < 32) {
  throw new Error('CSRF_SECRET must be at least 32 characters long');
}

const jwtExpiresIn = values.JWT_EXPIRES_IN;
const cookieName = values.COOKIE_NAME;
const csrfCookieName = `${cookieName}_csrf`;
const csrfSessionCookieName = `${cookieName}_csrf_session`;

const bcryptRounds = Number(process.env.BCRYPT_ROUNDS || '12');

if (!Number.isInteger(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
  throw new Error('BCRYPT_ROUNDS must be an integer between 10 and 15');
}

function parseDurationToMilliseconds(duration) {
  const match = /^(\d+)([smhd])$/.exec(duration);

  if (!match) {
    throw new Error(
      'JWT_EXPIRES_IN must use a duration such as 30m, 1h, 7d or 3600s'
    );
  }

  const amount = Number(match[1]);
  const amounts = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('JWT_EXPIRES_IN must be greater than zero');
  }

  return amount * amounts[match[2]];
}

const cookieMaxAgeMs = parseDurationToMilliseconds(jwtExpiresIn);
const isProduction = nodeEnv === 'production';

const cookieBaseOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
};

module.exports = Object.freeze({
  nodeEnv,
  port,
  databaseStorage,
  jwtSecret,
  jwtExpiresIn,
  cookieName,
  csrfSecret,
  csrfCookieName,
  csrfSessionCookieName,
  bcryptRounds,
  cookieMaxAgeMs,
  cookieOptions: Object.freeze({
    ...cookieBaseOptions,
    maxAge: cookieMaxAgeMs,
  }),
  cookieClearOptions: Object.freeze(cookieBaseOptions),
  csrfCookieOptions: Object.freeze(cookieBaseOptions),
  isProduction,
});
