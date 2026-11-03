'use strict';

const express = require('express');
const { body } = require('express-validator');

const taskController = require('../controllers/taskController');
const taskService = require('../services/taskService');
const { authenticate } = require('../middlewares/authenticate');
const { authorize, loadOwnedTask } = require('../middlewares/authorize');
const { validate } = require('../middlewares/validate');

const router = express.Router();

const taskValidation = [
  body('title')
    .isString()
    .withMessage('El título debe ser texto.')
    .trim()
    .notEmpty()
    .withMessage('El título es obligatorio.')
    .isLength({ max: 150 })
    .withMessage('El título no puede superar los 150 caracteres.'),
  body('description')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('La descripción debe ser texto.')
    .trim()
    .isLength({ max: 5000 })
    .withMessage('La descripción no puede superar los 5000 caracteres.'),
  body('subject')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('La asignatura debe ser texto.')
    .trim()
    .isLength({ max: 100 })
    .withMessage('La asignatura no puede superar los 100 caracteres.'),
  body('dueDate')
    .optional({ values: 'falsy' })
    .isDate({ format: 'YYYY-MM-DD', strictMode: true })
    .withMessage('Introduce una fecha límite válida con formato AAAA-MM-DD.'),
];

const statusValidation = [
  body('status')
    .isString()
    .withMessage('El estado no es válido.')
    .isIn(taskService.TASK_STATUSES)
    .withMessage('El estado debe ser pendiente o completada.'),
];

router.use(authenticate, authorize('user'));

router.get('/', taskController.listTasks);
router.get('/create', taskController.showCreateTask);
router.post('/', taskValidation, validate, taskController.createTask);

router.get('/:id', loadOwnedTask, taskController.showTask);
router.get('/:id/edit', loadOwnedTask, taskController.showEditTask);
router.post(
  '/:id/update',
  loadOwnedTask,
  taskValidation,
  validate,
  taskController.updateTask
);
router.post('/:id/delete', loadOwnedTask, taskController.deleteTask);
router.post(
  '/:id/status',
  loadOwnedTask,
  statusValidation,
  validate,
  taskController.updateTaskStatus
);

module.exports = router;
