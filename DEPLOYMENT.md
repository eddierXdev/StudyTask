# Despliegue de StudyTask en Render

Esta guía corresponde a la Fase 9. La configuración incluida usa los planes gratuitos de Render para la demostración académica.

## Requisitos

- Cuenta de Render.
- Repositorio Git con el proyecto (GitHub, GitLab o Bitbucket).
- Acceso al panel de Render para crear el Blueprint y consultar las variables de entorno.
- Node.js 24 y `npm` instalados localmente para ejecutar comandos de administración contra la base de datos de producción.

## 1. Publicar el repositorio

El proyecto debe estar en un repositorio Git accesible por Render. Antes de subirlo, confirma que `.env` y `Credenciales admin/` no forman parte del repositorio.

El archivo `render.yaml` usa:

- Un servicio web Node.js en el plan gratuito.
- Una base PostgreSQL gratuita.
- Variables de entorno de producción.
- HTTPS proporcionado por Render.
- Migraciones ejecutadas al iniciar el servicio.
- Node.js `24.22.1` y un rango compatible en `package.json`.

## 2. Crear el Blueprint

1. En Render, selecciona **New > Blueprint**.
2. Conecta el repositorio y selecciona la rama principal.
3. Render detectará `render.yaml`.
4. Confirma la creación del servicio web y de la base de datos.
5. Espera a que termine el primer despliegue.

La base de datos gratuita de Render expira 30 días después de su creación. Para una entrega que deba permanecer disponible más tiempo, cambia el plan de la base de datos antes de esa fecha.

## 3. Migraciones

En el plan gratuito Render no ofrece terminal ni `preDeployCommand`. Por eso el comando de inicio es:

```text
npm run start:production
```

Ese comando ejecuta `npm run db:migrate` y después inicia `server.js`. Las migraciones son idempotentes.

Para ejecutar migraciones manualmente desde el equipo local, usa la URL externa de PostgreSQL de Render:

```powershell
$env:DATABASE_URL = 'postgresql://.../?sslmode=require'
npm run db:migrate
Remove-Item Env:DATABASE_URL
```

La URL externa se obtiene en Render desde **Base de datos > Connect > External Database URL**. No publiques ni guardes esa URL en el repositorio. Las conexiones externas están permitidas por defecto; si las restringes después de crear el administrador, ten en cuenta que ya no podrás ejecutar migraciones o tareas administrativas desde tu equipo local.

## 4. Crear el primer administrador de producción

El registro público solo crea usuarios con rol `user`. El primer administrador se crea con el script controlado.

Desde una terminal privada, configura temporalmente las variables necesarias. Los valores de `JWT_SECRET` y `CSRF_SECRET` pueden ser valores locales temporales: este script no los usa para crear el administrador y no deben guardarse. Solo `DATABASE_URL` debe ser la URL externa real de producción.

```powershell
$env:NODE_ENV = 'production'
$env:PORT = '10000'
$env:DATABASE_URL = 'postgresql://.../?sslmode=require'
$env:JWT_SECRET = 'temporary-local-value-not-used-for-admin-creation'
$env:CSRF_SECRET = 'temporary-local-value-not-used-for-admin-creation'
$env:JWT_EXPIRES_IN = '1h'
$env:COOKIE_NAME = 'studytask_token'
$env:BCRYPT_ROUNDS = '12'

npm run create-admin

Remove-Item Env:NODE_ENV, Env:PORT, Env:DATABASE_URL, Env:JWT_SECRET, Env:CSRF_SECRET, Env:JWT_EXPIRES_IN, Env:COOKIE_NAME, Env:BCRYPT_ROUNDS
```

El script solicita nombre, correo y contraseña de forma interactiva. No guardes la contraseña en variables de entorno ni en archivos del proyecto.

## 5. Verificación de producción

Con la URL pública de Render:

- Abre la URL pública y comprueba que responde por HTTPS.
- Comprueba que una solicitud HTTP redirige a HTTPS.
- Registra un usuario nuevo e inicia sesión.
- Crea una tarea.
- Redespliega o reinicia el servicio y confirma que la tarea persiste.
- En las herramientas de desarrollo del navegador, confirma que la cookie de sesión tiene:
  - `Secure`
  - `HttpOnly`
  - `SameSite=Lax`
- Confirma que `/.env`, `/package.json` y `/Credenciales%20admin/Credenciales.txt` responden `404`.
- Confirma que no aparecen contraseñas, hashes, JWT ni cadenas de conexión en las páginas.
- Accede con el administrador creado y verifica las vistas de tareas y usuarios.

La verificación local de modo producción se puede ejecutar con:

```powershell
npm run test:production
```

Esa prueba valida cookies `Secure`, HSTS y CSP en un servidor local. No sustituye la comprobación de HTTPS sobre la URL pública de Render.

## 6. Seguridad y operación

- No subas `.env`, `Credenciales admin/` ni URLs de conexión.
- Render genera `JWT_SECRET` y `CSRF_SECRET`; no los reemplaces por valores débiles.
- Si un secreto se expone, genera uno nuevo y redespliega.
- No uses `sequelize.sync({ alter: true })` en producción.
- Las migraciones se ejecutan con `sequelize-cli`; el comando de inicio las aplica antes de arrancar.
- Revisa los logs de Render sin copiar cookies, tokens ni datos sensibles.
- La base de datos gratuita no tiene copias de seguridad. Para una entrega de largo plazo, considera un plan de pago o exporta los datos.

## 7. Limitaciones del plan gratuito

- El servicio web se suspende tras 15 minutos sin tráfico y tarda aproximadamente un minuto en reactivarse.
- La base de datos gratuita expira a los 30 días.
- No hay Shell ni trabajos puntuales en el servicio gratuito.
- La base de datos gratuita tiene 1 GB y no incluye copias de seguridad.
- No se debe usar el plan gratuito como producción real de largo plazo.

## 8. Reversión de migraciones

Para revertir la última migración:

```powershell
$env:DATABASE_URL = 'postgresql://.../?sslmode=require'
npm run db:migrate:undo
Remove-Item Env:DATABASE_URL
```

No ejecutes reversiones en producción sin una copia de seguridad o una verificación previa de los datos.
