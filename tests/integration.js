'use strict';

const assert = require('node:assert/strict');

const app = require('../app');
const environment = require('../config/environment');
const adminService = require('../services/adminService');
const { sequelize, Task, User } = require('../models');

const runId = `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
const password = `Phase8-${runId}-Pass`;
const accounts = {
  owner: {
    name: 'Phase 8 Owner',
    email: `phase8.owner.${runId}@example.com`,
    password,
  },
  other: {
    name: 'Phase 8 Other',
    email: `phase8.other.${runId}@example.com`,
    password,
  },
  admin: {
    name: 'Phase 8 Admin',
    email: `phase8.admin.${runId}@example.com`,
    password,
  },
};

const state = {
  server: null,
  baseUrl: '',
  ownerJar: null,
  otherJar: null,
  adminJar: null,
  ownerId: null,
  otherId: null,
  adminId: null,
  ownerTaskId: null,
  protectedTaskId: null,
};

let currentStep = '';
let stepCount = 0;

function createCookieJar() {
  return new Map();
}

function applySetCookies(response, jar) {
  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];

  for (const setCookie of setCookies) {
    const pair = setCookie.split(';', 1)[0];
    const separatorIndex = pair.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const name = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);
    const isExpired =
      /max-age=0/i.test(setCookie) ||
      /expires=thu, 01 jan 1970/i.test(setCookie);

    if (value === '' || isExpired) {
      jar.delete(name);
    } else {
      jar.set(name, value);
    }
  }
}

function getCookieHeader(jar) {
  return Array.from(jar, ([name, value]) => `${name}=${value}`).join('; ');
}

function findSetCookie(response, name) {
  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];

  return setCookies.find((setCookie) => setCookie.startsWith(`${name}=`));
}

function getCookieValue(setCookie, name) {
  const pair = setCookie.split(';', 1)[0];
  return pair.slice(name.length + 1);
}

async function request(jar, path, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookieHeader = getCookieHeader(jar);

  if (cookieHeader) {
    headers.set('cookie', cookieHeader);
  }

  let body = options.body;

  if (options.form) {
    body = new URLSearchParams(options.form).toString();
    headers.set('content-type', 'application/x-www-form-urlencoded');
  }

  const response = await fetch(`${state.baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body,
    redirect: options.redirect || 'manual',
  });

  applySetCookies(response, jar);
  return response;
}

async function getPage(jar, path) {
  const response = await request(jar, path);
  const html = await response.text();
  return { response, html };
}

async function postForm(jar, path, form) {
  const response = await request(jar, path, {
    method: 'POST',
    form,
  });
  const html = await response.text();
  return { response, html };
}

function extractCsrfToken(html) {
  const match = html.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(match, 'Expected a CSRF token in the rendered page.');
  return match[1];
}

function assertStatus(response, expected, label) {
  assert.equal(
    response.status,
    expected,
    `${label}: expected status ${expected}, received ${response.status}.`
  );
}

function assertRedirect(response, expectedLocation, label) {
  assertStatus(response, 302, label);
  assert.equal(
    response.headers.get('location'),
    expectedLocation,
    `${label}: unexpected redirect target.`
  );
}

function assertIncludes(text, expected, label) {
  assert.ok(text.includes(expected), label);
}

function assertNotIncludes(text, unexpected, label) {
  assert.ok(!text.includes(unexpected), label);
}

function assertMatches(text, pattern, label) {
  assert.ok(pattern.test(text), label);
}

function assertNoPasswordHash(html) {
  assert.ok(!/\$2[aby]\$/.test(html), 'Rendered page exposes a bcrypt hash.');
}

function assertNoInternalDetails(html) {
  for (const value of [
    'EBADCSRFTOKEN',
    'Invalid CSRF token',
    'Invalid email or password',
    'Access is forbidden.',
    'Task not found.',
    'Sequelize',
    'node_modules',
  ]) {
    assertNotIncludes(html, value, `Rendered page exposes internal detail: ${value}`);
  }
}

function assertCsrfFailure(result) {
  assertStatus(result.response, 403, 'CSRF rejection');
  assertIncludes(
    result.html,
    'La solicitud no es válida o ha expirado. Vuelve a intentarlo.',
    'CSRF rejection must show the generic retry message.'
  );
  assertNoInternalDetails(result.html);
}

function assertCookieFlags(setCookie, label) {
  assert.ok(setCookie, `${label}: cookie was not set.`);
  assertIncludes(setCookie, 'HttpOnly', `${label}: cookie must be HttpOnly.`);
  assertIncludes(setCookie, 'SameSite=Lax', `${label}: cookie must use SameSite=Lax.`);
  assertIncludes(setCookie, 'Path=/', `${label}: cookie must use Path=/.`);

  if (environment.isProduction) {
    assertIncludes(setCookie, 'Secure', `${label}: cookie must be Secure in production.`);
  }
}

function assertCookieCleared(response, name, label) {
  const setCookie = findSetCookie(response, name);
  assert.ok(setCookie, `${label}: clearing cookie was not sent.`);
  assertMatches(
    setCookie,
    /Max-Age=0|Expires=Thu, 01 Jan 1970/i,
    `${label}: cookie was not expired.`
  );

  if (environment.isProduction) {
    assertIncludes(setCookie, 'Secure', `${label}: clearing cookie must be Secure in production.`);
  }
}

async function register(jar, account, extraFields = {}) {
  const page = await getPage(jar, '/register');
  const csrfToken = extractCsrfToken(page.html);
  const result = await postForm(jar, '/register', {
    _csrf: csrfToken,
    name: account.name,
    email: account.email,
    password: account.password,
    ...extraFields,
  });

  return { page, ...result };
}

async function login(jar, email, loginPassword) {
  const page = await getPage(jar, '/login');
  const csrfToken = extractCsrfToken(page.html);
  const result = await postForm(jar, '/login', {
    _csrf: csrfToken,
    email,
    password: loginPassword,
  });

  return { page, ...result };
}

async function createTask(jar, fields) {
  const page = await getPage(jar, '/tasks/create');
  const csrfToken = extractCsrfToken(page.html);
  const result = await postForm(jar, '/tasks', {
    _csrf: csrfToken,
    ...fields,
  });
  const location = result.response.headers.get('location') || '';
  const match = /^\/tasks\/(\d+)\?created=1$/.exec(location);

  assert.ok(match, 'Task creation did not redirect to the new task.');

  return {
    ...result,
    id: Number(match[1]),
  };
}

async function getDbUser(email, withPassword = false) {
  const query = withPassword ? User.scope('withPassword') : User;
  return query.findOne({ where: { email } });
}

async function getDbTask(taskId) {
  return Task.findByPk(taskId);
}

async function countTasksForUser(userId) {
  return Task.count({ where: { userId } });
}

async function step(name, callback) {
  stepCount += 1;
  currentStep = name;
  await callback();
  console.log(`ok ${stepCount} - ${name}`);
}

async function cleanup() {
  const emails = Object.values(accounts).map((account) => account.email);
  const users = await User.findAll({
    where: { email: emails },
    attributes: ['id'],
  });
  const userIds = users.map((user) => user.id);

  if (userIds.length > 0) {
    await Task.destroy({ where: { userId: userIds } });
    await User.destroy({ where: { id: userIds } });
  }
}

async function main() {
  try {
    await step('Create controlled test administrator', async () => {
      const admin = await adminService.createAdminUser(accounts.admin);
      state.adminId = admin.id;
      assert.equal(admin.role, 'admin');
    });

    await step('Start the application on an ephemeral port', async () => {
      await new Promise((resolve) => {
        state.server = app.listen(0, resolve);
      });

      const { port } = state.server.address();
      state.baseUrl = `http://127.0.0.1:${port}`;
    });

    await step('Anonymous access to private routes redirects to login', async () => {
      const anonymousJar = createCookieJar();
      const privatePaths = [
        '/dashboard',
        '/tasks',
        '/tasks/create',
        '/tasks/1',
        '/tasks/1/edit',
        '/admin/tasks',
        '/admin/tasks/1',
        '/admin/users',
      ];

      for (const path of privatePaths) {
        const { response } = await getPage(anonymousJar, path);
        assertRedirect(response, '/login', `Anonymous GET ${path}`);
      }
    });

    await step('Security headers and static file protection are applied', async () => {
      const home = await getPage(createCookieJar(), '/');
      assertStatus(home.response, 200, 'Home page');
      const contentSecurityPolicy =
        home.response.headers.get('content-security-policy') || '';
      assertIncludes(
        contentSecurityPolicy,
        "default-src 'self'",
        'Home page must include a content security policy.'
      );

      if (environment.isProduction) {
        assertIncludes(
          contentSecurityPolicy,
          'upgrade-insecure-requests',
          'Production must upgrade insecure requests.'
        );
        assertIncludes(
          home.response.headers.get('strict-transport-security') || '',
          'max-age=',
          'Production must include HSTS.'
        );
      }

      assert.equal(
        home.response.headers.get('x-content-type-options'),
        'nosniff',
        'X-Content-Type-Options must be nosniff.'
      );
      assert.equal(
        home.response.headers.get('x-powered-by'),
        null,
        'X-Powered-By must not be exposed.'
      );

      for (const path of [
        '/.env',
        '/.gitignore',
        '/package.json',
        '/tests/integration.js',
        '/Credenciales%20admin/Credenciales.txt',
      ]) {
        const { response, html } = await getPage(createCookieJar(), path);
        assertStatus(response, 404, `Static secret path ${path}`);
        assertIncludes(html, 'Error 404', `Static secret path ${path} page`);
        assertNotIncludes(html, 'DATABASE_URL', `Static secret path ${path} leak`);
        assertNoInternalDetails(html);
      }

      const oversizedResponse = await fetch(`${state.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: `email=${'x'.repeat(110 * 1024)}`,
      });
      assertStatus(oversizedResponse, 413, 'Oversized request');
      const oversizedHtml = await oversizedResponse.text();
      assertIncludes(
        oversizedHtml,
        'La solicitud es demasiado grande.',
        'Oversized request must show the generic size error.'
      );
      assertNoInternalDetails(oversizedHtml);
    });

    await step('Invalid registration shows server-side validation messages', async () => {
      const invalidJar = createCookieJar();
      const page = await getPage(invalidJar, '/register');
      const csrfToken = extractCsrfToken(page.html);
      const result = await postForm(invalidJar, '/register', {
        _csrf: csrfToken,
        name: '',
        email: 'not-an-email',
        password: 'short',
      });

      assertStatus(result.response, 422, 'Invalid registration');
      assertIncludes(result.html, 'alert alert-danger', 'Registration error alert');
      assertIncludes(result.html, 'El nombre es obligatorio.', 'Name validation message');
      assertIncludes(
        result.html,
        'Introduce un correo electrónico válido.',
        'Email validation message'
      );
      assertIncludes(
        result.html,
        'La contraseña debe tener al menos 8 caracteres.',
        'Password validation message'
      );
      assert.equal(
        await User.count({ where: { email: 'not-an-email' } }),
        0,
        'Invalid registration must not create a user.'
      );
      assertNoInternalDetails(result.html);
    });

    await step('Registration works and duplicate email is rejected', async () => {
      state.ownerJar = createCookieJar();
      const registration = await register(state.ownerJar, accounts.owner);
      assertRedirect(
        registration.response,
        '/login?registered=1',
        'Owner registration'
      );

      const csrfSessionCookie = findSetCookie(
        registration.page.response,
        environment.csrfSessionCookieName
      );
      assertCookieFlags(csrfSessionCookie, 'CSRF session cookie');

      const csrfTokenCookie = findSetCookie(
        registration.page.response,
        environment.csrfCookieName
      );
      assertCookieFlags(csrfTokenCookie, 'CSRF token cookie');

      const owner = await getDbUser(accounts.owner.email, true);
      assert.ok(owner, 'Owner must exist in the database.');
      state.ownerId = owner.id;
      assert.equal(owner.role, 'user', 'Public registration must assign role user.');
      assertMatches(owner.password, /^\$2[aby]\$/, 'Password must be stored as bcrypt.');
      assertNotIncludes(
        owner.password,
        accounts.owner.password,
        'Password must not be stored in plaintext.'
      );

      const registeredPage = await getPage(
        state.ownerJar,
        '/login?registered=1'
      );
      assertIncludes(
        registeredPage.html,
        'Cuenta creada correctamente. Ya puedes iniciar sesión.',
        'Registration success message'
      );

      const duplicateJar = createCookieJar();
      const duplicate = await register(duplicateJar, accounts.owner);
      assertStatus(duplicate.response, 409, 'Duplicate registration');
      assertIncludes(
        duplicate.html,
        'Ya existe una cuenta con ese correo electrónico.',
        'Duplicate registration message'
      );
      assert.equal(
        await User.count({ where: { email: accounts.owner.email } }),
        1,
        'Duplicate registration must not create another user.'
      );
      assertNoPasswordHash(duplicate.html);
    });

    await step('Public registration cannot assign the admin role', async () => {
      state.otherJar = createCookieJar();
      const registration = await register(state.otherJar, accounts.other, {
        role: 'admin',
      });
      assertRedirect(
        registration.response,
        '/login?registered=1',
        'Other user registration'
      );

      const other = await getDbUser(accounts.other.email, true);
      assert.ok(other, 'Other user must exist in the database.');
      state.otherId = other.id;
      assert.equal(
        other.role,
        'user',
        'The role field from the registration form must be ignored.'
      );
      assertMatches(other.password, /^\$2[aby]\$/, 'Password must be stored as bcrypt.');
    });

    await step('Invalid credentials are rejected without leaking details', async () => {
      const invalidJar = createCookieJar();
      const page = await getPage(invalidJar, '/login');
      const csrfToken = extractCsrfToken(page.html);
      const wrongPassword = `${accounts.owner.password}-wrong`;
      const result = await postForm(invalidJar, '/login', {
        _csrf: csrfToken,
        email: accounts.owner.email,
        password: wrongPassword,
      });

      assertStatus(result.response, 401, 'Invalid password login');
      assertIncludes(
        result.html,
        'Correo o contraseña incorrectos.',
        'Invalid password message'
      );
      assertNotIncludes(result.html, wrongPassword, 'Password must not be reflected.');
      assertNoInternalDetails(result.html);
      assert.equal(
        findSetCookie(result.response, environment.cookieName),
        undefined,
        'Failed login must not set a session cookie.'
      );

      const unknownJar = createCookieJar();
      const unknownPage = await getPage(unknownJar, '/login');
      const unknownToken = extractCsrfToken(unknownPage.html);
      const unknownResult = await postForm(unknownJar, '/login', {
        _csrf: unknownToken,
        email: `missing.${runId}@example.com`,
        password,
      });

      assertStatus(unknownResult.response, 401, 'Unknown email login');
      assertIncludes(
        unknownResult.html,
        'Correo o contraseña incorrectos.',
        'Unknown email must use the same generic message.'
      );
      assertNoInternalDetails(unknownResult.html);
    });

    await step('Valid login sets a secure HttpOnly session cookie', async () => {
      const result = await login(
        state.ownerJar,
        accounts.owner.email,
        accounts.owner.password
      );
      assertRedirect(result.response, '/dashboard', 'Owner login');

      const sessionCookie = findSetCookie(
        result.response,
        environment.cookieName
      );
      assertCookieFlags(sessionCookie, 'Session cookie');
      assertMatches(
        sessionCookie,
        /Max-Age=\d+|Expires=/i,
        'Session cookie must include an expiration.'
      );

      const tokenValue = getCookieValue(sessionCookie, environment.cookieName);
      assert.ok(tokenValue.length > 20, 'Session token must not be empty.');

      const dashboard = await getPage(state.ownerJar, '/dashboard');
      assertStatus(dashboard.response, 200, 'Owner dashboard');
      assertIncludes(dashboard.html, accounts.owner.name, 'Dashboard user name');
      assertNotIncludes(
        dashboard.html,
        tokenValue,
        'Session token must not be rendered in HTML.'
      );
      assertNoPasswordHash(dashboard.html);
      assertNoInternalDetails(dashboard.html);
    });

    await step('Task creation validates input and escapes user content', async () => {
      assert.equal(
        await countTasksForUser(state.ownerId),
        0,
        'Owner must start without tasks.'
      );

      const page = await getPage(state.ownerJar, '/tasks/create');
      const csrfToken = extractCsrfToken(page.html);
      const invalid = await postForm(state.ownerJar, '/tasks', {
        _csrf: csrfToken,
        title: '',
        description: 'Attempted invalid task',
        subject: 'x'.repeat(101),
        dueDate: '2026-13-40',
      });

      assertStatus(invalid.response, 422, 'Invalid task creation');
      assertIncludes(invalid.html, 'El título es obligatorio.', 'Title validation message');
      assertIncludes(
        invalid.html,
        'La asignatura no puede superar los 100 caracteres.',
        'Subject validation message'
      );
      assertIncludes(
        invalid.html,
        'Introduce una fecha límite válida con formato AAAA-MM-DD.',
        'Due date validation message'
      );
      assert.equal(
        await countTasksForUser(state.ownerId),
        0,
        'Invalid task creation must not create a task.'
      );

      const taskOne = await createTask(state.ownerJar, {
        title: 'Phase 8 CRUD task',
        description: 'Initial description.',
        subject: 'Node.js',
        dueDate: '2026-12-01',
      });
      state.ownerTaskId = taskOne.id;

      const xssTitle = '<script>alert("phase8-xss")</script>';
      const escapedXssTitle =
        '&lt;script&gt;alert(&#34;phase8-xss&#34;)&lt;/script&gt;';
      const taskTwo = await createTask(state.ownerJar, {
        title: xssTitle,
        description: 'Task used to verify ownership and escaping.',
        subject: 'Security',
        dueDate: '2026-12-02',
      });
      state.protectedTaskId = taskTwo.id;

      assert.equal(
        await countTasksForUser(state.ownerId),
        2,
        'Owner must have two tasks.'
      );

      const list = await getPage(state.ownerJar, '/tasks');
      assertStatus(list.response, 200, 'Owner task list');
      assertIncludes(list.html, 'Phase 8 CRUD task', 'Owner task list content');
      assertIncludes(list.html, escapedXssTitle, 'Task title must be escaped.');
      assertNotIncludes(list.html, xssTitle, 'Task title must not render raw HTML.');
      assertNoPasswordHash(list.html);

      const detail = await getPage(
        state.ownerJar,
        `/tasks/${taskOne.id}?created=1`
      );
      assertStatus(detail.response, 200, 'Task detail');
      assertIncludes(detail.html, 'Phase 8 CRUD task', 'Task detail title');
      assertIncludes(
        detail.html,
        'Tarea creada correctamente.',
        'Task creation success message'
      );
      assertIncludes(detail.html, 'Pendiente', 'New task status');
      assertNoPasswordHash(detail.html);
    });

    await step('Own task can be read and updated', async () => {
      const detail = await getPage(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}`
      );
      assertStatus(detail.response, 200, 'Own task detail');
      assertIncludes(detail.html, 'Initial description.', 'Own task description');

      const edit = await getPage(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}/edit`
      );
      assertStatus(edit.response, 200, 'Own task edit form');
      const csrfToken = extractCsrfToken(edit.html);
      const update = await postForm(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}/update`,
        {
          _csrf: csrfToken,
          title: 'Phase 8 CRUD task updated',
          description: 'Updated description.',
          subject: 'Express',
          dueDate: '2026-12-05',
        }
      );

      assertRedirect(
        update.response,
        `/tasks/${state.ownerTaskId}?updated=1`,
        'Own task update'
      );

      const updated = await getPage(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}?updated=1`
      );
      assertStatus(updated.response, 200, 'Updated task detail');
      assertIncludes(updated.html, 'Phase 8 CRUD task updated', 'Updated task title');
      assertIncludes(updated.html, 'Express', 'Updated task subject');
      assertIncludes(
        updated.html,
        'Tarea actualizada correctamente.',
        'Task update success message'
      );

      const before = await getDbTask(state.ownerTaskId);
      assert.equal(before.title, 'Phase 8 CRUD task updated', 'Task title in database');

      const editAgain = await getPage(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}/edit`
      );
      const invalidToken = extractCsrfToken(editAgain.html);
      const invalidUpdate = await postForm(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}/update`,
        {
          _csrf: invalidToken,
          title: '',
          description: 'Invalid update',
          subject: 'Express',
          dueDate: '2026-12-05',
        }
      );

      assertStatus(invalidUpdate.response, 422, 'Invalid task update');
      assertIncludes(
        invalidUpdate.html,
        'El título es obligatorio.',
        'Invalid update title message'
      );
      const after = await getDbTask(state.ownerTaskId);
      assert.equal(
        after.title,
        before.title,
        'Invalid update must not change the task.'
      );
    });

    await step('Task status changes and filters work', async () => {
      const detail = await getPage(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}`
      );
      const csrfToken = extractCsrfToken(detail.html);
      const statusUpdate = await postForm(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}/status`,
        {
          _csrf: csrfToken,
          status: 'completed',
        }
      );

      assertRedirect(
        statusUpdate.response,
        `/tasks/${state.ownerTaskId}?statusUpdated=1`,
        'Task status update'
      );

      const completedDetail = await getPage(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}?statusUpdated=1`
      );
      assertStatus(completedDetail.response, 200, 'Completed task detail');
      assertIncludes(completedDetail.html, 'Completada', 'Completed status');
      assertIncludes(
        completedDetail.html,
        'Estado de la tarea actualizado correctamente.',
        'Status update success message'
      );

      const completedTask = await getDbTask(state.ownerTaskId);
      assert.equal(completedTask.status, 'completed', 'Completed status in database');

      const invalidStatusToken = extractCsrfToken(completedDetail.html);
      const invalidStatus = await postForm(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}/status`,
        {
          _csrf: invalidStatusToken,
          status: 'archived',
        }
      );

      assertStatus(invalidStatus.response, 422, 'Invalid task status');
      assertIncludes(
        invalidStatus.html,
        'El estado debe ser pendiente o completada.',
        'Invalid status message'
      );
      assert.equal(
        (await getDbTask(state.ownerTaskId)).status,
        'completed',
        'Invalid status must not change the task.'
      );

      const xssTitle = '<script>alert("phase8-xss")</script>';
      const escapedXssTitle =
        '&lt;script&gt;alert(&#34;phase8-xss&#34;)&lt;/script&gt;';
      const completedList = await getPage(
        state.ownerJar,
        '/tasks?status=completed'
      );
      assertStatus(completedList.response, 200, 'Completed task filter');
      assertIncludes(
        completedList.html,
        'Phase 8 CRUD task updated',
        'Completed filter must include the completed task.'
      );
      assertNotIncludes(
        completedList.html,
        escapedXssTitle,
        'Completed filter must exclude pending tasks.'
      );

      const pendingList = await getPage(
        state.ownerJar,
        '/tasks?status=pending'
      );
      assertStatus(pendingList.response, 200, 'Pending task filter');
      assertIncludes(
        pendingList.html,
        escapedXssTitle,
        'Pending filter must include the pending task.'
      );
      assertNotIncludes(
        pendingList.html,
        'Phase 8 CRUD task updated',
        'Pending filter must exclude completed tasks.'
      );

      const allList = await getPage(state.ownerJar, '/tasks?status=invalid');
      assertStatus(allList.response, 200, 'Invalid status filter');
      assertIncludes(
        allList.html,
        'Phase 8 CRUD task updated',
        'Invalid filter must fall back to all tasks.'
      );
      assertIncludes(
        allList.html,
        escapedXssTitle,
        'Invalid filter must include pending tasks.'
      );

      assertNotIncludes(allList.html, xssTitle, 'Filtered list must escape HTML.');
    });

    await step('CSRF protection blocks unauthorized mutations', async () => {
      const beforeCount = await countTasksForUser(state.ownerId);
      const noToken = await postForm(state.ownerJar, '/tasks', {
        title: 'Task without CSRF token',
      });
      assertCsrfFailure(noToken);
      assert.equal(
        await countTasksForUser(state.ownerId),
        beforeCount,
        'CSRF failure must not create a task.'
      );

      const noTokenLogout = await postForm(state.ownerJar, '/logout', {});
      assertCsrfFailure(noTokenLogout);
      const dashboardAfterFailedLogout = await getPage(
        state.ownerJar,
        '/dashboard'
      );
      assertStatus(
        dashboardAfterFailedLogout.response,
        200,
        'Session after failed logout CSRF'
      );

      const anonymousJar = createCookieJar();
      const anonymousPage = await getPage(anonymousJar, '/login');
      const anonymousToken = extractCsrfToken(anonymousPage.html);
      const anonymousPost = await postForm(anonymousJar, '/tasks', {
        _csrf: anonymousToken,
        title: 'Anonymous task',
      });
      assertRedirect(
        anonymousPost.response,
        '/login',
        'Anonymous POST with CSRF token'
      );

      const getDelete = await getPage(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}/delete`
      );
      assertStatus(getDelete.response, 404, 'GET task deletion');
      assert.ok(
        await getDbTask(state.ownerTaskId),
        'GET must not delete a task.'
      );
    });

    await step('Own task can be deleted', async () => {
      const detail = await getPage(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}`
      );
      const csrfToken = extractCsrfToken(detail.html);
      const deletion = await postForm(
        state.ownerJar,
        `/tasks/${state.ownerTaskId}/delete`,
        {
          _csrf: csrfToken,
        }
      );

      assertRedirect(deletion.response, '/tasks?deleted=1', 'Own task deletion');
      assert.equal(
        await getDbTask(state.ownerTaskId),
        null,
        'Task must be removed from the database.'
      );

      const list = await getPage(state.ownerJar, '/tasks?deleted=1');
      assertStatus(list.response, 200, 'Task list after deletion');
      assertIncludes(
        list.html,
        'Tarea eliminada correctamente.',
        'Task deletion success message'
      );
      assertNotIncludes(
        list.html,
        'Phase 8 CRUD task updated',
        'Deleted task must not remain in the list.'
      );
    });

    await step('Another user cannot access or modify the task', async () => {
      const otherLogin = await login(
        state.otherJar,
        accounts.other.email,
        accounts.other.password
      );
      assertRedirect(otherLogin.response, '/dashboard', 'Other user login');

      const xssTitle = '<script>alert("phase8-xss")</script>';
      const escapedXssTitle =
        '&lt;script&gt;alert(&#34;phase8-xss&#34;)&lt;/script&gt;';
      const otherList = await getPage(state.otherJar, '/tasks');
      assertStatus(otherList.response, 200, 'Other user task list');
      assertNotIncludes(
        otherList.html,
        escapedXssTitle,
        'Other user must not see the owner task.'
      );

      const taskUrl = `/tasks/${state.protectedTaskId}`;
      const read = await getPage(state.otherJar, taskUrl);
      assertStatus(read.response, 404, 'Other user task read');
      assertIncludes(
        read.html,
        'La página solicitada no existe.',
        'Other user task read message'
      );
      assertNoInternalDetails(read.html);

      const edit = await getPage(state.otherJar, `${taskUrl}/edit`);
      assertStatus(edit.response, 404, 'Other user task edit');

      const createPage = await getPage(state.otherJar, '/tasks/create');
      const otherToken = extractCsrfToken(createPage.html);
      const update = await postForm(
        state.otherJar,
        `${taskUrl}/update`,
        {
          _csrf: otherToken,
          title: 'Hijacked task',
          description: 'Should not be applied.',
          subject: 'Security',
          dueDate: '2026-12-10',
        }
      );
      assertStatus(update.response, 404, 'Other user task update');

      const statusUpdate = await postForm(
        state.otherJar,
        `${taskUrl}/status`,
        {
          _csrf: otherToken,
          status: 'completed',
        }
      );
      assertStatus(statusUpdate.response, 404, 'Other user task status update');

      const deletion = await postForm(state.otherJar, `${taskUrl}/delete`, {
        _csrf: otherToken,
      });
      assertStatus(deletion.response, 404, 'Other user task deletion');

      const protectedTask = await getDbTask(state.protectedTaskId);
      assert.equal(protectedTask.title, xssTitle, 'Other user must not alter the task.');
      assert.equal(
        protectedTask.status,
        'pending',
        'Other user must not alter the task status.'
      );

      const ownerTokenPage = await getPage(state.ownerJar, '/tasks/create');
      const ownerToken = extractCsrfToken(ownerTokenPage.html);
      const crossSession = await postForm(state.otherJar, '/tasks', {
        _csrf: ownerToken,
        title: 'Cross-session task',
      });
      assertCsrfFailure(crossSession);
      assert.equal(
        await countTasksForUser(state.ownerId),
        1,
        'Cross-session CSRF must not create a task.'
      );
    });

    await step('Regular user cannot access administrative routes', async () => {
      const xssTitle = '<script>alert("phase8-xss")</script>';
      const adminTasks = await getPage(state.otherJar, '/admin/tasks');
      assertStatus(adminTasks.response, 403, 'Regular user admin task list');
      assertIncludes(
        adminTasks.html,
        'No tienes permisos para acceder a esta página.',
        'Admin access denial message'
      );
      assertNotIncludes(
        adminTasks.html,
        xssTitle,
        'Admin task list must not leak data to a regular user.'
      );
      assertNoInternalDetails(adminTasks.html);

      const adminUsers = await getPage(state.otherJar, '/admin/users');
      assertStatus(adminUsers.response, 403, 'Regular user admin user list');
      assertNotIncludes(
        adminUsers.html,
        accounts.owner.email,
        'Admin user list must not leak data to a regular user.'
      );

      const adminTask = await getPage(
        state.otherJar,
        `/admin/tasks/${state.protectedTaskId}`
      );
      assertStatus(adminTask.response, 403, 'Regular user admin task detail');

      const createPage = await getPage(state.otherJar, '/tasks/create');
      const otherToken = extractCsrfToken(createPage.html);
      const adminDeletion = await postForm(
        state.otherJar,
        `/admin/tasks/${state.protectedTaskId}/delete`,
        {
          _csrf: otherToken,
        }
      );
      assertStatus(adminDeletion.response, 403, 'Regular user admin task deletion');
      assert.ok(
        await getDbTask(state.protectedTaskId),
        'Regular user must not delete an admin task.'
      );
    });

    await step('Logout clears the session cookie', async () => {
      const dashboard = await getPage(state.otherJar, '/dashboard');
      assertStatus(dashboard.response, 200, 'Other user dashboard before logout');
      const csrfToken = extractCsrfToken(dashboard.html);
      const logout = await postForm(state.otherJar, '/logout', {
        _csrf: csrfToken,
      });

      assertRedirect(logout.response, '/login?loggedOut=1', 'Logout');
      assertCookieCleared(logout.response, environment.cookieName, 'Logout');
      assert.equal(
        state.otherJar.get(environment.cookieName),
        undefined,
        'Session cookie must be removed from the client jar.'
      );

      const loggedOutPage = await getPage(
        state.otherJar,
        '/login?loggedOut=1'
      );
      assertIncludes(
        loggedOutPage.html,
        'Has cerrado sesión correctamente.',
        'Logout success message'
      );

      const afterLogout = await getPage(state.otherJar, '/dashboard');
      assertRedirect(afterLogout.response, '/login', 'Dashboard after logout');
    });

    await step('Administrator can view and delete any task', async () => {
      state.adminJar = createCookieJar();
      const adminLogin = await login(
        state.adminJar,
        accounts.admin.email,
        accounts.admin.password
      );
      assertRedirect(adminLogin.response, '/dashboard', 'Admin login');

      const dashboard = await getPage(state.adminJar, '/dashboard');
      assertStatus(dashboard.response, 200, 'Admin dashboard');
      assertIncludes(dashboard.html, 'Gestionar tareas', 'Admin dashboard actions');
      assertIncludes(dashboard.html, 'Ver usuarios', 'Admin dashboard users link');

      const xssTitle = '<script>alert("phase8-xss")</script>';
      const escapedXssTitle =
        '&lt;script&gt;alert(&#34;phase8-xss&#34;)&lt;/script&gt;';
      const adminTasks = await getPage(state.adminJar, '/admin/tasks');
      assertStatus(adminTasks.response, 200, 'Admin task list');
      assertIncludes(adminTasks.html, escapedXssTitle, 'Admin task list escaping');
      assertIncludes(adminTasks.html, accounts.owner.email, 'Admin task owner email');
      assertNoPasswordHash(adminTasks.html);

      const adminDetail = await getPage(
        state.adminJar,
        `/admin/tasks/${state.protectedTaskId}`
      );
      assertStatus(adminDetail.response, 200, 'Admin task detail');
      assertIncludes(adminDetail.html, escapedXssTitle, 'Admin detail escaping');
      assertIncludes(adminDetail.html, accounts.owner.email, 'Admin detail owner email');
      assertIncludes(adminDetail.html, 'Eliminar tarea', 'Admin delete action');

      const adminUsers = await getPage(state.adminJar, '/admin/users');
      assertStatus(adminUsers.response, 200, 'Admin user list');
      assertIncludes(adminUsers.html, 'table-responsive', 'Responsive user table');
      assertIncludes(adminUsers.html, accounts.owner.email, 'Owner email in user list');
      assertIncludes(adminUsers.html, accounts.other.email, 'Other email in user list');
      assertIncludes(adminUsers.html, accounts.admin.email, 'Admin email in user list');
      assertNoPasswordHash(adminUsers.html);

      const adminTaskRoute = await getPage(state.adminJar, '/tasks');
      assertStatus(adminTaskRoute.response, 403, 'Admin access to user task route');

      const noTokenDeletion = await postForm(
        state.adminJar,
        `/admin/tasks/${state.protectedTaskId}/delete`,
        {}
      );
      assertCsrfFailure(noTokenDeletion);
      assert.ok(
        await getDbTask(state.protectedTaskId),
        'CSRF failure must not delete an admin task.'
      );

      const detailForToken = await getPage(
        state.adminJar,
        `/admin/tasks/${state.protectedTaskId}`
      );
      const csrfToken = extractCsrfToken(detailForToken.html);
      const deletion = await postForm(
        state.adminJar,
        `/admin/tasks/${state.protectedTaskId}/delete`,
        {
          _csrf: csrfToken,
        }
      );

      assertRedirect(
        deletion.response,
        '/admin/tasks?deleted=1',
        'Admin task deletion'
      );
      assert.equal(
        await getDbTask(state.protectedTaskId),
        null,
        'Admin deletion must remove the task.'
      );

      const adminTasksAfter = await getPage(
        state.adminJar,
        '/admin/tasks?deleted=1'
      );
      assertIncludes(
        adminTasksAfter.html,
        'Tarea eliminada correctamente.',
        'Admin deletion success message'
      );
      assertNotIncludes(
        adminTasksAfter.html,
        escapedXssTitle,
        'Deleted task must not remain in the admin list.'
      );
    });

    await step('Invalid sessions are rejected and cleared', async () => {
      const invalidJar = createCookieJar();
      invalidJar.set(environment.cookieName, 'invalid.jwt.token');
      const response = await request(invalidJar, '/dashboard');
      assertRedirect(response, '/login?sessionExpired=1', 'Invalid session');
      assertCookieCleared(response, environment.cookieName, 'Invalid session');

      const afterInvalid = await getPage(invalidJar, '/dashboard');
      assertRedirect(
        afterInvalid.response,
        '/login',
        'Dashboard after invalid session'
      );
    });

    await step('Error pages hide internal details', async () => {
      const missing = await getPage(state.ownerJar, '/does-not-exist');
      assertStatus(missing.response, 404, 'Unknown route');
      assertIncludes(missing.html, 'Error 404', 'Unknown route page');
      assertIncludes(
        missing.html,
        'La página solicitada no existe.',
        'Unknown route message'
      );
      assertNoInternalDetails(missing.html);

      const invalidTask = await getPage(
        state.ownerJar,
        '/tasks/not-a-number'
      );
      assertStatus(invalidTask.response, 404, 'Invalid task identifier');
      assertIncludes(
        invalidTask.html,
        'La página solicitada no existe.',
        'Invalid task identifier message'
      );
      assertNoInternalDetails(invalidTask.html);

      const getLogout = await getPage(state.ownerJar, '/logout');
      assertStatus(getLogout.response, 404, 'GET logout');
    });

    console.log('Phase 8 integration tests passed.');
  } catch (error) {
    console.error(`not ok - ${currentStep}`);
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    if (state.server) {
      await new Promise((resolve, reject) => {
        state.server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    try {
      await cleanup();
    } catch (error) {
      console.error(`Cleanup failed: ${error.message}`);
      process.exitCode = 1;
    }

    try {
      await sequelize.close();
    } catch (error) {
      // The process is ending; do not expose connection details.
    }
  }
}

main();
