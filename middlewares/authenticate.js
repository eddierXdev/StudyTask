'use strict';

const environment = require('../config/environment');
const { User } = require('../models');
const { verifyToken } = require('../services/authService');

function clearSessionCookie(res) {
  res.clearCookie(environment.cookieName, environment.cookieClearOptions);
}

async function authenticate(req, res, next) {
  const token = req.cookies ? req.cookies[environment.cookieName] : undefined;

  if (!token) {
    return res.redirect('/login');
  }

  let payload;

  try {
    payload = verifyToken(token);

    if (!payload || !payload.sub) {
      throw new Error('Invalid token payload');
    }
  } catch (error) {
    clearSessionCookie(res);
    return res.redirect('/login?sessionExpired=1');
  }

  let user;

  try {
    user = await User.findByPk(payload.sub);
  } catch (error) {
    return next(error);
  }

  if (!user) {
    clearSessionCookie(res);
    return res.redirect('/login?sessionExpired=1');
  }

  req.user = user;
  return next();
}

module.exports = {
  authenticate,
};
