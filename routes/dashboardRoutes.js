'use strict';

const express = require('express');

const { renderDashboard } = require('../controllers/dashboardController');
const { authenticate } = require('../middlewares/authenticate');

const router = express.Router();

router.get('/dashboard', authenticate, renderDashboard);

module.exports = router;
