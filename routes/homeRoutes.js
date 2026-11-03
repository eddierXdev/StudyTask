const express = require('express');
const { renderHome } = require('../controllers/homeController');

const router = express.Router();

router.get('/', renderHome);

module.exports = router;
