'use strict';

const environment = require('../config/environment');
const authService = require('../services/authService');
const { clearCsrfCookies } = require('../middlewares/csrf');

function buildLoginFormData(body) {
  return {
    email: typeof body.email === 'string' ? body.email : '',
  };
}

function buildRegisterFormData(body) {
  return {
    name: typeof body.name === 'string' ? body.name : '',
    email: typeof body.email === 'string' ? body.email : '',
  };
}

function showLogin(req, res) {
  let success;
  let error;

  if (req.query.registered === '1') {
    success = 'Cuenta creada correctamente. Ya puedes iniciar sesión.';
  } else if (req.query.loggedOut === '1') {
    success = 'Has cerrado sesión correctamente.';
  } else if (req.query.sessionExpired === '1') {
    error = 'Tu sesión ha expirado. Inicia sesión de nuevo.';
  }

  return res.render('auth/login', {
    title: 'Iniciar sesión',
    success,
    error,
    formData: { email: '' },
  });
}

function showRegister(req, res) {
  return res.render('auth/register', {
    title: 'Crear cuenta',
    formData: { name: '', email: '' },
  });
}

async function register(req, res, next) {
  const body = req.body || {};
  const errors = req.validationErrors || [];
  const formData = buildRegisterFormData(body);

  if (errors.length > 0) {
    return res.status(422).render('auth/register', {
      title: 'Crear cuenta',
      errors,
      formData,
    });
  }

  try {
    await authService.registerUser({
      name: body.name,
      email: body.email,
      password: body.password,
    });

    return res.redirect('/login?registered=1');
  } catch (error) {
    if (error instanceof authService.AuthServiceError) {
      if (error.code === 'EMAIL_EXISTS') {
        return res.status(409).render('auth/register', {
          title: 'Crear cuenta',
          error: 'Ya existe una cuenta con ese correo electrónico.',
          formData,
        });
      }
    }

    return next(error);
  }
}

async function login(req, res, next) {
  const body = req.body || {};
  const errors = req.validationErrors || [];
  const formData = buildLoginFormData(body);

  if (errors.length > 0) {
    return res.status(422).render('auth/login', {
      title: 'Iniciar sesión',
      errors,
      formData,
    });
  }

  try {
    const { token } = await authService.loginUser({
      email: body.email,
      password: body.password,
    });

    res.cookie(environment.cookieName, token, environment.cookieOptions);

    return res.redirect('/dashboard');
  } catch (error) {
    if (error instanceof authService.AuthServiceError) {
      if (error.code === 'INVALID_CREDENTIALS') {
        return res.status(401).render('auth/login', {
          title: 'Iniciar sesión',
          error: 'Correo o contraseña incorrectos.',
          formData,
        });
      }
    }

    return next(error);
  }
}

function logout(req, res) {
  res.clearCookie(environment.cookieName, environment.cookieClearOptions);
  clearCsrfCookies(res);
  return res.redirect('/login?loggedOut=1');
}

module.exports = {
  showLogin,
  showRegister,
  register,
  login,
  logout,
};
