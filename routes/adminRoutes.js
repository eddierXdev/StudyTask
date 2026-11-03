'use strict';

const express = require('express');

const adminController = require('../controllers/adminController');
const { authenticate } = require('../middlewares/authenticate');
const { authorize, loadAdminTask } = require('../middlewares/authorize');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/tasks', adminController.listTasks);
router.get('/tasks/:id', loadAdminTask, adminController.showTask);
router.post(
  '/tasks/:id/delete',
  loadAdminTask,
  adminController.deleteTask
);
router.get('/users', adminController.listUsers);

module.exports = router;
