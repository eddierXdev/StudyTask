'use strict';

const { Task } = require('../models');

const TASK_STATUSES = Object.freeze(['pending', 'completed']);

class TaskServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TaskServiceError';
    this.code = code;
  }
}

function normalizeOptionalText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' ? null : trimmedValue;
}

function normalizeDueDate(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  return value.trim();
}

function normalizeStatusFilter(status) {
  return TASK_STATUSES.includes(status) ? status : null;
}

async function createTask({ userId, title, description, subject, dueDate }) {
  return Task.create({
    userId,
    title: String(title).trim(),
    description: normalizeOptionalText(description),
    subject: normalizeOptionalText(subject),
    dueDate: normalizeDueDate(dueDate),
    status: 'pending',
  });
}

async function listOwnedTasks({ userId, status }) {
  const where = { userId };
  const normalizedStatus = normalizeStatusFilter(status);

  if (normalizedStatus) {
    where.status = normalizedStatus;
  }

  return Task.findAll({
    where,
    order: [
      ['dueDate', 'ASC'],
      ['created_at', 'DESC'],
    ],
  });
}

async function findOwnedTask({ taskId, userId }) {
  return Task.findOne({
    where: {
      id: taskId,
      userId,
    },
  });
}

async function updateOwnedTask({
  taskId,
  userId,
  title,
  description,
  subject,
  dueDate,
}) {
  const [updatedCount] = await Task.update(
    {
      title: String(title).trim(),
      description: normalizeOptionalText(description),
      subject: normalizeOptionalText(subject),
      dueDate: normalizeDueDate(dueDate),
    },
    {
      where: {
        id: taskId,
        userId,
      },
    }
  );

  if (updatedCount === 0) {
    return null;
  }

  return findOwnedTask({ taskId, userId });
}

async function deleteOwnedTask({ taskId, userId }) {
  return Task.destroy({
    where: {
      id: taskId,
      userId,
    },
  });
}

async function setOwnedTaskStatus({ taskId, userId, status }) {
  if (!TASK_STATUSES.includes(status)) {
    throw new TaskServiceError('INVALID_STATUS', 'Invalid task status.');
  }

  const [updatedCount] = await Task.update(
    { status },
    {
      where: {
        id: taskId,
        userId,
      },
    }
  );

  return updatedCount;
}

module.exports = {
  TASK_STATUSES,
  TaskServiceError,
  createTask,
  listOwnedTasks,
  findOwnedTask,
  updateOwnedTask,
  deleteOwnedTask,
  setOwnedTaskStatus,
  normalizeStatusFilter,
};
