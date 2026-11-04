'use strict';

const { initializeDatabase } = require('./initDatabase');
const { bootstrapAdmin } = require('./bootstrapAdmin');

let readyPromise = null;

function ensureInitialized(req, res, next) {
  if (!readyPromise) {
    readyPromise = Promise.resolve()
      .then(() => {
        initializeDatabase();
        return bootstrapAdmin();
      })
      .catch((error) => {
        // Allow the next request to retry after a transient failure.
        readyPromise = null;
        throw error;
      });
  }

  readyPromise.then(
    () => next(),
    (error) => {
      console.error(`StudyTask initialization failed: ${error.message}`);

      if (!res.headersSent) {
        res.status(500).send('Error interno del servidor');
      }
    }
  );
}

module.exports = { ensureInitialized };
