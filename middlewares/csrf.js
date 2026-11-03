'use strict';

const crypto = require('node:crypto');
const { doubleCsrf } = require('csrf-csrf');

const environment = require('../config/environment');

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => environment.csrfSecret,
  getSessionIdentifier: (req) => req.csrfSessionId,
  cookieName: environment.csrfCookieName,
  cookieOptions: environment.csrfCookieOptions,
  getCsrfTokenFromRequest: (req) => req.body?._csrf,
  errorConfig: {
    statusCode: 403,
    message: 'Invalid CSRF token',
    code: 'EBADCSRFTOKEN',
  },
});

function ensureCsrfSession(req, res, next) {
  const existingSessionId = req.cookies
    ? req.cookies[environment.csrfSessionCookieName]
    : undefined;

  let csrfSessionId = existingSessionId;

  if (
    typeof csrfSessionId !== 'string' ||
    !/^[a-f0-9]{64}$/.test(csrfSessionId)
  ) {
    csrfSessionId = crypto.randomBytes(32).toString('hex');
    res.cookie(
      environment.csrfSessionCookieName,
      csrfSessionId,
      environment.csrfCookieOptions
    );

    if (req.cookies) {
      req.cookies[environment.csrfSessionCookieName] = csrfSessionId;
    }
  }

  req.csrfSessionId = csrfSessionId;
  return next();
}

function provideCsrfToken(req, res, next) {
  res.locals.csrfToken = generateCsrfToken(req, res);
  return next();
}

function clearCsrfCookies(res) {
  res.clearCookie(environment.csrfCookieName, environment.cookieClearOptions);
  res.clearCookie(
    environment.csrfSessionCookieName,
    environment.cookieClearOptions
  );
}

module.exports = {
  ensureCsrfSession,
  doubleCsrfProtection,
  provideCsrfToken,
  clearCsrfCookies,
};
