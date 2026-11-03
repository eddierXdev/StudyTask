'use strict';

const assert = require('node:assert/strict');

const taskService = require('../services/taskService');
const { sequelize, Task, User } = require('../models');

const runId = `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
const email = `database.check.${runId}@example.com`;
let userId = null;

async function select(sql) {
  return sequelize.query(sql, {
    type: sequelize.QueryTypes.SELECT,
  });
}

async function main() {
  try {
    assert.equal(sequelize.getDialect(), 'sqlite', 'The application must use SQLite.');
    await sequelize.authenticate();

    const [foreignKeys] = await select('PRAGMA foreign_keys');
    assert.equal(foreignKeys.foreign_keys, 1, 'SQLite foreign keys must be enabled.');

    const tables = await select(
      "SELECT name, sql FROM sqlite_master WHERE type = 'table'"
    );
    const tableSql = Object.fromEntries(
      tables.map((table) => [table.name, table.sql || ''])
    );

    assert.match(
      tableSql.users,
      /CHECK \(`role` IN \('user', 'admin'\)\)/,
      'users.role must have a database CHECK constraint.'
    );
    assert.match(
      tableSql.tasks,
      /CHECK \(`status` IN \('pending', 'completed'\)\)/,
      'tasks.status must have a database CHECK constraint.'
    );
    assert.match(
      tableSql.tasks,
      /REFERENCES `users` \(`id`\) ON DELETE RESTRICT ON UPDATE CASCADE/,
      'tasks.user_id must preserve the foreign key actions.'
    );

    const userIndexes = await select('PRAGMA index_list(users)');
    assert.ok(
      userIndexes.some((index) => index.unique === 1),
      'users.email must have a unique index.'
    );

    const taskIndexes = await select('PRAGMA index_list(tasks)');
    const taskIndexNames = taskIndexes.map((index) => index.name);
    assert.ok(
      taskIndexNames.includes('tasks_user_id_idx'),
      'tasks.user_id must have an index.'
    );
    assert.ok(
      taskIndexNames.includes('tasks_status_idx'),
      'tasks.status must have an index.'
    );

    const user = await User.create({
      name: 'Database Check User',
      email,
      password: 'not-a-real-password-hash',
      role: 'user',
    });
    userId = user.id;

    await assert.rejects(
      () =>
        User.create({
          name: 'Duplicate Email User',
          email,
          password: 'not-a-real-password-hash',
          role: 'user',
        }),
      (error) => error.name === 'SequelizeUniqueConstraintError',
      'A duplicate email must be rejected by the unique constraint.'
    );

    await assert.rejects(
      () =>
        sequelize.query(
          `INSERT INTO users (name, email, password, role, created_at)
           VALUES ('Invalid Role', 'invalid.role.${runId}@example.com', 'x', 'invalid', CURRENT_TIMESTAMP)`
        ),
      (error) => /CHECK constraint failed/.test(error.original?.message || error.message),
      'An invalid role must be rejected by the database.'
    );

    await assert.rejects(
      () =>
        sequelize.query(
          `INSERT INTO tasks (title, status, user_id, created_at, updated_at)
           VALUES ('Invalid Status', 'archived', ${userId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ),
      (error) => /CHECK constraint failed/.test(error.original?.message || error.message),
      'An invalid status must be rejected by the database.'
    );

    await assert.rejects(
      () =>
        sequelize.query(
          `INSERT INTO tasks (title, status, user_id, created_at, updated_at)
           VALUES ('Orphan Task', 'pending', 999999, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ),
      (error) => /FOREIGN KEY constraint failed/.test(error.original?.message || error.message),
      'A task without an existing owner must be rejected by the foreign key.'
    );

    await Task.create({
      userId,
      title: 'Dated task',
      dueDate: '2026-12-01',
      status: 'pending',
    });

    await Task.create({
      userId,
      title: 'Task without due date',
      dueDate: null,
      status: 'pending',
    });

    const orderedTasks = await taskService.listOwnedTasks({ userId });
    assert.deepEqual(
      orderedTasks.map((task) => task.title),
      ['Dated task', 'Task without due date'],
      'Tasks without a due date must be ordered last.'
    );

    await assert.rejects(
      () => User.destroy({ where: { id: userId } }),
      (error) => error.name === 'SequelizeForeignKeyConstraintError',
      'A user with tasks must not be deleted.'
    );

    await Task.destroy({ where: { userId } });
    await User.destroy({ where: { id: userId } });
    userId = null;

    console.log('SQLite database integrity tests passed.');
  } finally {
    try {
      if (userId !== null) {
        await Task.destroy({ where: { userId } });
        await User.destroy({ where: { id: userId } });
      }
    } finally {
      await sequelize.close();
    }
  }
}

main().catch((error) => {
  console.error('not ok - SQLite database integrity tests');
  console.error(error.message);
  process.exitCode = 1;
});
