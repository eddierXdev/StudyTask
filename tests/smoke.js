'use strict';

const assert = require('node:assert/strict');
const app = require('../app');

function getCookieHeader(response) {
  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];

  return setCookies.map((setCookie) => setCookie.split(';', 1)[0]).join('; ');
}

function extractCsrfToken(html) {
  const match = html.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(match, 'Expected a CSRF token in the rendered page.');
  return match[1];
}

const server = app.listen(0, async () => {
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const homeResponse = await fetch(`${baseUrl}/`);
    assert.equal(homeResponse.status, 200);
    assert.match(homeResponse.headers.get('content-type') || '', /text\/html/);

    const homeHtml = await homeResponse.text();
    assert.match(homeHtml, /StudyTask/);
    assert.match(homeHtml, /\/vendor\/bootstrap\/css\/bootstrap\.min\.css/);
    assert.match(homeHtml, /\/vendor\/bootstrap\/js\/bootstrap\.bundle\.min\.js/);
    assert.match(homeHtml, /\/css\/styles\.css/);
    assert.match(homeHtml, /\/js\/main\.js/);
    assert.match(homeHtml, /navbar-toggler/);
    assert.match(homeHtml, /visually-hidden-focusable/);
    assert.match(homeHtml, /id="main-content"/);
    assert.match(homeHtml, /aria-current="page"/);
    assert.match(homeHtml, /\/login/);
    assert.match(homeHtml, /\/register/);

    const cssResponse = await fetch(`${baseUrl}/css/styles.css`);
    assert.equal(cssResponse.status, 200);
    assert.match(cssResponse.headers.get('content-type') || '', /text\/css/);

    const bootstrapCssResponse = await fetch(
      `${baseUrl}/vendor/bootstrap/css/bootstrap.min.css`
    );
    assert.equal(bootstrapCssResponse.status, 200);
    assert.match(
      bootstrapCssResponse.headers.get('content-type') || '',
      /text\/css/
    );

    const bootstrapJsResponse = await fetch(
      `${baseUrl}/vendor/bootstrap/js/bootstrap.bundle.min.js`
    );
    assert.equal(bootstrapJsResponse.status, 200);
    assert.match(
      bootstrapJsResponse.headers.get('content-type') || '',
      /javascript/
    );

    const loginResponse = await fetch(`${baseUrl}/login`);
    assert.equal(loginResponse.status, 200);
    const loginHtml = await loginResponse.text();
    assert.match(loginHtml, /Iniciar sesión/);
    assert.match(loginHtml, /class="form-control"/);
    assert.match(loginHtml, /btn btn-primary/);
    assert.match(loginHtml, /name="_csrf" value="[^"]+"/);

    const registerResponse = await fetch(`${baseUrl}/register`);
    assert.equal(registerResponse.status, 200);
    const registerHtml = await registerResponse.text();
    assert.match(registerHtml, /Crear cuenta/);
    assert.match(registerHtml, /class="form-control"/);
    assert.match(registerHtml, /btn btn-primary/);
    assert.match(registerHtml, /name="_csrf" value="[^"]+"/);

    const invalidRegisterResponse = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: {
        cookie: getCookieHeader(registerResponse),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        _csrf: extractCsrfToken(registerHtml),
        name: '',
        email: 'not-an-email',
        password: 'short',
      }).toString(),
    });
    assert.equal(invalidRegisterResponse.status, 422);
    const invalidRegisterHtml = await invalidRegisterResponse.text();
    assert.match(invalidRegisterHtml, /alert alert-danger/);
    assert.match(invalidRegisterHtml, /El nombre es obligatorio/);
    assert.match(invalidRegisterHtml, /Introduce un correo electrónico válido/);
    assert.match(
      invalidRegisterHtml,
      /La contraseña debe tener al menos 8 caracteres/
    );

    const invalidLoginResponse = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        cookie: getCookieHeader(loginResponse),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        _csrf: extractCsrfToken(loginHtml),
        email: 'user@example.com',
        password: '',
      }).toString(),
    });
    assert.equal(invalidLoginResponse.status, 422);
    const invalidLoginHtml = await invalidLoginResponse.text();
    assert.match(invalidLoginHtml, /alert alert-danger/);
    assert.match(invalidLoginHtml, /La contraseña es obligatoria/);

    const dashboardResponse = await fetch(`${baseUrl}/dashboard`, {
      redirect: 'manual',
    });
    assert.equal(dashboardResponse.status, 302);
    assert.equal(dashboardResponse.headers.get('location'), '/login');

    const tasksResponse = await fetch(`${baseUrl}/tasks`, {
      redirect: 'manual',
    });
    assert.equal(tasksResponse.status, 302);
    assert.equal(tasksResponse.headers.get('location'), '/login');

    const taskCreateResponse = await fetch(`${baseUrl}/tasks/create`, {
      redirect: 'manual',
    });
    assert.equal(taskCreateResponse.status, 302);
    assert.equal(taskCreateResponse.headers.get('location'), '/login');

    const adminTasksResponse = await fetch(`${baseUrl}/admin/tasks`, {
      redirect: 'manual',
    });
    assert.equal(adminTasksResponse.status, 302);
    assert.equal(adminTasksResponse.headers.get('location'), '/login');

    const adminUsersResponse = await fetch(`${baseUrl}/admin/users`, {
      redirect: 'manual',
    });
    assert.equal(adminUsersResponse.status, 302);
    assert.equal(adminUsersResponse.headers.get('location'), '/login');

    const csrfFailureResponse = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'test@example.com',
        password: 'securePass123',
      }).toString(),
    });
    assert.equal(csrfFailureResponse.status, 403);
    const csrfFailureHtml = await csrfFailureResponse.text();
    assert.match(csrfFailureHtml, /La solicitud no es válida o ha expirado/);
    assert.doesNotMatch(csrfFailureHtml, /EBADCSRFTOKEN|Invalid CSRF token/);

    const notFoundResponse = await fetch(`${baseUrl}/does-not-exist`);
    assert.equal(notFoundResponse.status, 404);
    assert.match(await notFoundResponse.text(), /Error 404/);

    console.log(
      'Smoke test passed: home, Bootstrap assets, auth pages, validation messages, CSRF rejection, protected task and admin routes, static files and 404 response.'
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
