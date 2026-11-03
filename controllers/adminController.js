'use strict';

const adminService = require('../services/adminService');

function createTaskNotFoundError() {
  const error = new Error('Task not found.');
  error.status = 404;
  return error;
}

function buildAdminTaskSuccessMessage(query) {
  if (query.deleted === '1') {
    return 'Tarea eliminada correctamente.';
  }

  return undefined;
}

async function listTasks(req, res, next) {
  try {
    const tasks = await adminService.listAllTasks();

    return res.render('admin/tasks', {
      title: 'Todas las tareas',
      currentUser: req.user.toJSON(),
      tasks: tasks.map((task) => task.toJSON()),
      success: buildAdminTaskSuccessMessage(req.query),
    });
  } catch (error) {
    return next(error);
  }
}

function showTask(req, res) {
  return res.render('admin/show', {
    title: 'Detalle de tarea',
    currentUser: req.user.toJSON(),
    task: req.task.toJSON(),
  });
}

async function deleteTask(req, res, next) {
  try {
    const deletedCount = await adminService.deleteTaskById(req.task.id);

    if (deletedCount === 0) {
      return next(createTaskNotFoundError());
    }

    return res.redirect('/admin/tasks?deleted=1');
  } catch (error) {
    return next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await adminService.listUsers();

    return res.render('admin/users', {
      title: 'Usuarios registrados',
      currentUser: req.user.toJSON(),
      users: users.map((user) => user.toJSON()),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listTasks,
  showTask,
  deleteTask,
  listUsers,
};
