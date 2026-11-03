# Despliegue de StudyTask en Render (plan gratuito)

Esta guía despliega StudyTask con **SQLite** en un **Web Service gratuito de
Render**, sin método de pago ni disco persistente. La aplicación funciona,
pero el sistema de archivos del plan gratuito es efímero.

> **Importante:** en el plan gratuito, `studytask.db` se guarda en
> `/tmp/studytask.db`. Render puede reiniciar, suspender o redesplegar el
> servicio y el archivo se pierde. El plan gratuito sirve para demostrar la
> aplicación, no para conservar datos reales. Para persistencia se necesita un
> servicio de pago con disco persistente.

## 1. Requisitos

- Cuenta de Render sin método de pago, usando el plan **Free** del Web Service.
- Repositorio Git accesible por Render (GitHub, GitLab o Bitbucket).
- Node.js 24 y `npm` instalados localmente para desarrollo y pruebas.

No se necesita PostgreSQL, un servidor de base de datos externo ni un disco
de Render. La aplicación crea el archivo SQLite al arrancar.

## 2. Publicar el repositorio

Confirma que `.env`, `data/*.db` y `Credenciales admin/` no están rastreados:

```powershell
git status --short
git ls-files .env
git ls-files "data/*.db"
```

Haz commit y push de la versión que quieres desplegar. Render despliega desde
la rama del repositorio, no desde los archivos locales sin publicar.

## 3. Crear el Blueprint

1. En Render, selecciona **New > Blueprint**.
2. Conecta el repositorio y selecciona la rama principal.
3. Render detectará `render.yaml`.
4. Confirma el servicio web con el plan **Free**. No hay disco que confirmar.
5. Espera a que termine el primer despliegue.

El Blueprint configura:

- Servicio web Node.js con `plan: free`.
- Sin disco persistente.
- `DATABASE_STORAGE=/tmp/studytask.db`.
- Build con `npm ci --omit=dev`.
- Migraciones y arranque con `npm run start:production`.
- Secretos `JWT_SECRET` y `CSRF_SECRET` generados por Render.
- HTTPS proporcionado por Render.

## 4. Inicialización y administrador

El comando de inicio es:

```text
npm run start:production
```

Ese comando ejecuta `npm run db:init`, después `npm run bootstrap-admin` y
finalmente inicia `server.js`. `db:init` crea la carpeta y el archivo SQLite si
faltan, y aplica las migraciones pendientes.

Como el plan gratuito no ofrece Shell, el administrador se puede crear al
arrancar mediante variables de entorno. En **Environment** del servicio en
Render define, como secretos:

```text
ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=una-contraseña-de-demostracion
```

- `start:production` ejecutará `npm run bootstrap-admin`.
- Si la cuenta no existe, se crea con rol `admin`.
- Si ya existe con rol `admin`, el arranque continúa sin duplicarla.
- Si el correo pertenece a una cuenta `user`, **no** se eleva el rol; usa otro
  correo.
- En el plan gratuito, la cuenta se vuelve a crear después de cada reinicio
  porque la base SQLite es efímera.

Usa una contraseña exclusiva para la demostración. No reutilices
credenciales personales. `ADMIN_PASSWORD` queda en la configuración del
servicio de Render; no la escribas en el repositorio ni en `.env.example`.

Si no defines `ADMIN_*`, la aplicación sigue funcionando con registro público
de usuarios `user`, pero no habrá administrador.

## 5. Verificación de producción

Con la URL pública de Render:

- Abre la URL y comprueba que responde por HTTPS.
- Registra un usuario nuevo e inicia sesión.
- Crea una tarea.
- Confirma que el administrador configurado puede entrar y ver tareas y
  usuarios.
- En las herramientas de desarrollo del navegador, confirma que la cookie de
  sesión tiene `Secure`, `HttpOnly` y `SameSite=Lax`.
- Confirma que `/.env`, `/package.json`, `/data/studytask.db` y
  `/Credenciales%20admin/Credenciales.txt` responden `404`.
- Confirma que no aparecen contraseñas, hashes, JWT ni rutas internas en las
  páginas.

La verificación local del modo producción se puede ejecutar con:

```powershell
npm run test:production
```

Esa prueba valida cookies `Secure`, HSTS y CSP en un servidor local. No
sustituye la comprobación de HTTPS sobre la URL pública de Render.

## 6. Datos efímeros y persistencia

En el plan gratuito:

- El archivo SQLite vive en `/tmp/studytask.db`.
- El servicio puede suspenderse por inactividad y reiniciarse.
- Cada reinicio o redespliegue crea una base nueva con las migraciones.
- Los usuarios y tareas creados se pierden.
- El administrador configurado se vuelve a crear si se definieron las
  variables `ADMIN_*`.

No uses este plan para datos que deban conservarse. Si más adelante se
autoriza un plan de pago, se puede añadir un disco persistente y cambiar:

```yaml
plan: starter
disk:
  name: studytask-data
  mountPath: /var/data
  sizeGB: 1
envVars:
  - key: DATABASE_STORAGE
    value: /var/data/studytask.db
```

Con disco persistente, la base sobrevive a reinicios y redespliegues. El
administrador solo se crea la primera vez. Mantén una sola instancia mientras
uses SQLite.

## 7. Copias de seguridad

- En el plan gratuito no hay almacenamiento persistente que respaldar.
- En un plan con disco, el archivo importante es
  `/var/data/studytask.db` y sus archivos auxiliares.
- Para una copia en caliente con `sqlite3` instalado:

```text
sqlite3 /var/data/studytask.db ".backup /var/data/studytask-backup.db"
```

- No copies el archivo mientras haya escrituras activas sin usar un mecanismo
  seguro de SQLite.

## 8. Seguridad y operación

- No subas `.env`, archivos `.db`, URLs de conexión ni credenciales.
- Render genera `JWT_SECRET` y `CSRF_SECRET`; no los reemplaces por valores
  débiles.
- Si un secreto se expone, genera uno nuevo y redespliega.
- Revisa los logs sin copiar cookies, tokens ni datos sensibles.
- Mantén el servicio con una sola instancia mientras use SQLite.
- El plan gratuito no ofrece Shell; usa las variables `ADMIN_*` para el
  administrador inicial.
- No ejecutes `sequelize.sync({ alter: true })` en producción.

## 9. Reversión de migraciones

Para revertir la última migración en un entorno con datos persistentes:

```powershell
npm run db:migrate:undo
```

No ejecutes reversiones en producción sin una copia de seguridad o una
verificación previa de los datos.

## 10. Migración desde PostgreSQL

La versión final no depende de PostgreSQL. La base SQLite se crea desde cero
con las migraciones. Si necesitas conservar datos de una instalación
PostgreSQL anterior, expórtalos antes de retirar esa instalación y traslada
los registros manualmente; la aplicación final no incluye un importador
automático ni el driver `pg`.
