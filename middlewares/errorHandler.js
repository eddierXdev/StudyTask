'use strict';

const defaultMessages = {
  400: 'La solicitud no es válida.',
  401: 'Debes iniciar sesión para acceder a esta página.',
  403: 'No tienes permisos para acceder a esta página.',
  404: 'La página solicitada no existe.',
  413: 'La solicitud es demasiado grande.',
  500: 'Ha ocurrido un error interno.',
};

function notFoundHandler(req, res) {
  res.status(404).render('error', {
    title: 'Página no encontrada',
    status: 404,
    message: defaultMessages[404],
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const candidateStatus = Number.isInteger(error.status)
    ? error.status
    : error.statusCode;
  const status =
    Number.isInteger(candidateStatus) &&
    candidateStatus >= 400 &&
    candidateStatus < 600
      ? candidateStatus
      : 500;

  if (status >= 500) {
    console.error(`Internal server error: ${error.name || 'Error'}`);
  }

  let message = defaultMessages[status] || 'La solicitud no se pudo procesar.';

  if (status === 403 && error.code === 'EBADCSRFTOKEN') {
    message =
      'La solicitud no es válida o ha expirado. Vuelve a intentarlo.';
  }

  return res.status(status).render('error', {
    title: `Error ${status}`,
    status,
    message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
