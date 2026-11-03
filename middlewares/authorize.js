'use strict';

const { findOwnedTask } = require('../services/taskService');
const adminService = require('../services/adminService');

function createAuthorizationError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function authorize(...allowedRoles) {
  if (allowedRoles.length === 0) {
    throw new Error('authorize requires at least one allowed role');
  }

  const roles = new Set(allowedRoles);

  return function authorizeRoles(req, res, next) {
    if (!req.user) {
      return next(
        createAuthorizationError(401, 'Authentication is required.')
      );
    }

    if (!roles.has(req.user.role)) {
      return next(createAuthorizationError(403, 'Access is forbidden.'));
    }

    return next();
  };
}

async function loadOwnedTask(req, res, next) {
  if (!req.user) {
    return next(createAuthorizationError(401, 'Authentication is required.'));
  }

  const taskId = Number(req.params.id);

  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    return next(createAuthorizationError(404, 'Task not found.'));
  }

  try {
    const task = await findOwnedTask({
      taskId,
      userId: req.user.id,
    });

    if (!task) {
      return next(createAuthorizationError(404, 'Task not found.'));
    }

    req.task = task;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function loadAdminTask(req, res, next) {
  if (!req.user) {
    return next(createAuthorizationError(401, 'Authentication is required.'));
  }

  const taskId = Number(req.params.id);

  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    return next(createAuthorizationError(404, 'Task not found.'));
  }

  try {
    const task = await adminService.findTaskById(taskId);

    if (!task) {
      return next(createAuthorizationError(404, 'Task not found.'));
    }

    req.task = task;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  authorize,
  loadOwnedTask,
  loadAdminTask,
};
