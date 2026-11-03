'use strict';

const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  req.validationErrors = result.array();
  return next();
}

module.exports = {
  validate,
};
