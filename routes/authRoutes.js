'use strict';

const express = require('express');
const { body } = require('express-validator');

const {
  showLogin,
  showRegister,
  register,
  login,
  logout,
} = require('../controllers/authController');
const { authenticate } = require('../middlewares/authenticate');
const { validate } = require('../middlewares/validate');

const router = express.Router();

const registerValidation = [
  body('name')
    .isString()
    .withMessage('El nombre debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio.')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede superar los 100 caracteres.'),
  body('email')
    .isString()
    .withMessage('El correo electrónico no es válido.')
    .trim()
    .isEmail()
    .withMessage('Introduce un correo electrónico válido.')
    .isLength({ max: 255 })
    .withMessage('El correo no puede superar los 255 caracteres.'),
  body('password')
    .isString()
    .withMessage('La contraseña no es válida.')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres.')
    .custom((value) => {
      if (Buffer.byteLength(value, 'utf8') > 72) {
        throw new Error('La contraseña no puede superar los 72 bytes.');
      }

      return true;
    }),
];

const loginValidation = [
  body('email')
    .isString()
    .withMessage('El correo electrónico no es válido.')
    .trim()
    .isEmail()
    .withMessage('Introduce un correo electrónico válido.')
    .isLength({ max: 255 })
    .withMessage('El correo no puede superar los 255 caracteres.'),
  body('password')
    .isString()
    .withMessage('La contraseña no es válida.')
    .notEmpty()
    .withMessage('La contraseña es obligatoria.'),
];

router.get('/register', showRegister);
router.post('/register', registerValidation, validate, register);
router.get('/login', showLogin);
router.post('/login', loginValidation, validate, login);
router.post('/logout', authenticate, logout);

module.exports = router;
