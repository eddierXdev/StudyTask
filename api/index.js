'use strict';

const express = require('express');

const app = require('../app');
const { ensureInitialized } = require('../scripts/serverlessInit');

// Vercel executes this file as a serverless function. The wrapper prepares the
// ephemeral SQLite database in /tmp before the first request and then delegates
// every request to the existing Express application.
const serverlessApp = express();

serverlessApp.use(ensureInitialized);
serverlessApp.use(app);

module.exports = serverlessApp;
