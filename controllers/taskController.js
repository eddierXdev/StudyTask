'use strict';

const taskService = require('../services/taskService');

function buildTaskFormData(body = {}) {
  return {
    title: typeof body.title === 'string' ? body.title : '',
    description:
      typeof body.description === 'string' ? body.description : '',
    subject: typeof body.subject === 'string' ? body.subject : '',
    dueDate: typeof body.dueDate === 'string' ? body.dueDate : '',
  };
}

function buildTaskFormDataFromTask(task) {
  return {
    title: task.title,
    description: task.description || '',
    subject: task.subject || '',
    dueDate: task.dueDate || '',
  };
}

function buildListSuccessMessage(query) {
  if (query.created === '1') {
    return 'Tarea creada correctamente.';
  }

  if (query.deleted === '1') {
    return 'Tarea eliminada correctamente.';
  }

  return undefined;
}

function buildShowSuccessMessage(query) {
  if (query.created === '1') {
    return 'Tarea creada correctamente.';
  }

  if (query.updated === '1') {
    return 'Tarea actualizada correctamente.';
  }

  if (query.statusUpdated === '1') {
    return 'Estado de la tarea actualizado correctamente.';
  }

  return undefined;
}

function createTaskNotFoundError() {
  const error = new Error('Task not found.');
  error.status = 404;
  return error;
}

async function listTasks(req, res, next) {
  const statusFilter =
    taskService.normalizeStatusFilter(req.query.status) || 'all';

  try {
    const tasks = await taskService.listOwnedTasks({
      userId: req.user.id,
      status: statusFilter,
    });

    return res.render('tasks/index', {
      title: 'Mis tareas',
      currentUser: req.user.toJSON(),
      tasks: tasks.map((task) => task.toJSON()),
      statusFilter,
      success: buildListSuccessMessage(req.query),
    });
  } catch (error) {
    return next(error);
  }
}

function showCreateTask(req, res) {
  return res.render('tasks/create', {
    title: 'Nueva tarea',
    currentUser: req.user.toJSON(),
    formData: buildTaskFormData(),
  });
}

async function createTask(req, res, next) {
  const body = req.body || {};
  const errors = req.validationErrors || [];
  const formData = buildTaskFormData(body);

  if (errors.length > 0) {
    return res.status(422).render('tasks/create', {
      title: 'Nueva tarea',
      currentUser: req.user.toJSON(),
      errors,
      formData,
    });
  }

  try {
    const task = await taskService.createTask({
      userId: req.user.id,
      title: body.title,
      description: body.description,
      subject: body.subject,
      dueDate: body.dueDate,
    });

    return res.redirect(`/tasks/${task.id}?created=1`);
  } catch (error) {
    return next(error);
  }
}

function showTask(req, res) {
  return res.render('tasks/show', {
    title: req.task.title,
    currentUser: req.user.toJSON(),
    task: req.task.toJSON(),
    success: buildShowSuccessMessage(req.query),
  });
}

function showEditTask(req, res) {
  return res.render('tasks/edit', {
    title: 'Editar tarea',
    currentUser: req.user.toJSON(),
    task: req.task.toJSON(),
    formData: buildTaskFormDataFromTask(req.task),
  });
}

async function updateTask(req, res, next) {
  const body = req.body || {};
  const errors = req.validationErrors || [];
  const formData = buildTaskFormData(body);

  if (errors.length > 0) {
    return res.status(422).render('tasks/edit', {
      title: 'Editar tarea',
      currentUser: req.user.toJSON(),
      task: req.task.toJSON(),
      errors,
      formData,
    });
  }

  try {
    const task = await taskService.updateOwnedTask({
      taskId: req.task.id,
      userId: req.user.id,
      title: body.title,
      description: body.description,
      subject: body.subject,
      dueDate: body.dueDate,
    });

    if (!task) {
      return next(createTaskNotFoundError());
    }

    return res.redirect(`/tasks/${task.id}?updated=1`);
  } catch (error) {
    return next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const deletedCount = await taskService.deleteOwnedTask({
      taskId: req.task.id,
      userId: req.user.id,
    });

    if (deletedCount === 0) {
      return next(createTaskNotFoundError());
    }

    return res.redirect('/tasks?deleted=1');
  } catch (error) {
    return next(error);
  }
}

async function updateTaskStatus(req, res, next) {
  const errors = req.validationErrors || [];

  if (errors.length > 0) {
    return res.status(422).render('tasks/show', {
      title: req.task.title,
      currentUser: req.user.toJSON(),
      task: req.task.toJSON(),
      errors,
      error: 'No se pudo cambiar el estado de la tarea.',
    });
  }

  try {
    const updatedCount = await taskService.setOwnedTaskStatus({
      taskId: req.task.id,
      userId: req.user.id,
      status: req.body.status,
    });

    if (updatedCount === 0) {
      return next(createTaskNotFoundError());
    }

    return res.redirect(`/tasks/${req.task.id}?statusUpdated=1`);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listTasks,
  showCreateTask,
  createTask,
  showTask,
  showEditTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
};
