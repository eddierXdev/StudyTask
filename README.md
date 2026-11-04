# StudyTask

**Gestor sencillo de tareas académicas.**

![Node.js](https://img.shields.io/badge/Node.js-24_LTS-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-6.x-52B0E7?logo=sequelize&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-sqlite3-003B57?logo=sqlite&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-Bootstrap_5-7952B3?logo=bootstrap&logoColor=white)
![Estado](https://img.shields.io/badge/estado-implementado-2ea44f)

StudyTask es una aplicación web académica para registrar, consultar y
actualizar tareas de estudio. Cada estudiante gestiona únicamente sus
propias tareas, mientras que un administrador puede consultar todas las
tareas y el listado de usuarios registrados.

---

## Tabla de contenido

- [Características](#características)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos](#requisitos)
- [Inicio rápido](#inicio-rápido)
- [Variables de entorno](#variables-de-entorno)
- [Scripts disponibles](#scripts-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Roles y permisos](#roles-y-permisos)
- [Rutas principales](#rutas-principales)
- [Base de datos](#base-de-datos)
- [Seguridad](#seguridad)
- [Pruebas](#pruebas)
- [Despliegue](#despliegue)
- [Documentación](#documentación)

---

## Características

- Registro e inicio/cierre de sesión.
- Contraseñas almacenadas con **bcrypt** (nunca en texto plano).
- Autenticación mediante **JWT** en una cookie `HttpOnly`.
- Protección **CSRF** en todas las operaciones que cambian estado.
- Roles `user` y `admin` con autorización por rol y por propiedad del
  recurso.
- CRUD de tareas propias: crear, listar, ver, editar y eliminar.
- Cambio de estado entre `pending` y `completed`.
- Filtro de tareas por estado.
- Panel administrativo de tareas y usuarios.
- Vistas renderizadas con **EJS** y **Bootstrap 5**.
- Persistencia en **SQLite** mediante un único archivo local.
- Validación de entradas en el servidor con `express-validator`.
- Cabeceras de seguridad con **Helmet** y manejo centralizado de errores.

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Entorno | Node.js 24 LTS |
| Servidor web | Express 5 |
| ORM | Sequelize 6 |
| Base de datos | SQLite mediante `sqlite3` |
| Vistas | EJS + `express-ejs-layouts` |
| Estilos | Bootstrap 5 |
| Autenticación | `jsonwebtoken` + `cookie-parser` |
| Contraseñas | `bcrypt` |
| Validación | `express-validator` |
| Seguridad HTTP | `helmet` + `csrf-csrf` |
| Configuración | `dotenv` |
| Migraciones | `sequelize-cli` |

> Se conserva Sequelize porque los modelos, asociaciones, servicios y
> migraciones ya dependen de su API. Sequelize 6 usa el driver `sqlite3`;
> `better-sqlite3` no es compatible con su dialecto SQLite sin reemplazar
> el ORM.

## Requisitos

- **Node.js** `24.x`
- **npm**
- No se necesita PostgreSQL ni ningún servidor de base de datos externo.

`sqlite3` incluye binarios precompilados para las plataformas habituales.
Si tu sistema no dispone de un binario compatible, necesitarás las
herramientas de compilación nativas.

## Inicio rápido

```bash
# 1. Clonar el repositorio
git clone https://github.com/eddierXdev/StudyTask.git
cd StudyTask

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de entorno
cp .env.example .env      # Linux/macOS
Copy-Item .env.example .env   # Windows PowerShell

# 4. Generar secretos locales
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Usa el primer valor para `JWT_SECRET` y el segundo para `CSRF_SECRET`.
Después:

```bash
# 5. Inicializar la base de datos y aplicar migraciones
npm run db:init

# 6. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en **http://localhost:3000**.

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `PORT` | No | Puerto HTTP local. Por defecto `3000`; Vercel no lo define. |
| `NODE_ENV` | Sí | `development`, `test` o `production`. |
| `DATABASE_STORAGE` | No | Ruta del archivo SQLite. Por defecto `data/studytask.db`; en Vercel se usa `/tmp/studytask.db`. |
| `JWT_SECRET` | Sí | Secreto de firma JWT, mínimo 32 caracteres. |
| `CSRF_SECRET` | Sí | Secreto CSRF, mínimo 32 caracteres. |
| `JWT_EXPIRES_IN` | Sí | Duración del JWT, por ejemplo `1h`. |
| `COOKIE_NAME` | Sí | Nombre de la cookie de sesión. |
| `BCRYPT_ROUNDS` | No | Coste de bcrypt, entre 10 y 15. Por defecto `12`. |
| `ADMIN_NAME` | No | Nombre del administrador inicial para `bootstrap-admin`. |
| `ADMIN_EMAIL` | No | Correo del administrador inicial. |
| `ADMIN_PASSWORD` | No | Contraseña del administrador inicial. |

`.env` está excluido de Git. `DATABASE_STORAGE` puede ser una ruta
relativa al proyecto o una ruta absoluta para un volumen persistente.

Las variables `ADMIN_*` solo se usan para crear el administrador inicial en
entornos gestionados sin Shell, como Vercel. En local es preferible usar
`npm run create-admin` y no guardar la contraseña en `.env`.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm start` | Inicia el servidor con la base ya inicializada. |
| `npm run dev` | Inicia el servidor en modo observación. |
| `npm run start:production` | Inicializa la base, crea el administrador si se configuró y arranca. |
| `scripts/start-alwaysdata.sh` | Arranque alternativo en Alwaysdata (migraciones, bootstrap y servidor). |
| `npm run db:init` | Crea la base si falta y ejecuta las migraciones. |
| `npm run db:migrate` | Ejecuta las migraciones pendientes. |
| `npm run db:migrate:status` | Muestra el estado de las migraciones. |
| `npm run db:migrate:undo` | Revierte la última migración. |
| `npm run db:check` | Comprueba la conexión y muestra el número de tablas. |
| `npm run create-admin` | Crea un administrador controlado de forma interactiva. |
| `npm run bootstrap-admin` | Crea el administrador desde `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. |
| `npm test` | Ejecuta pruebas de humo, integridad y flujo completo. |
| `npm run test:production` | Ejecuta la suite con cookies `Secure` y cabeceras de producción. |

## Estructura del proyecto

```text
studytask/
├── api/             Punto de entrada para Vercel Functions
├── config/          Configuración de entorno y SQLite
├── controllers/     Controladores HTTP
├── data/            Archivo SQLite local (ignorado por Git)
├── docs/            SRS, arquitectura, base de datos y plan
├── middlewares/     Autenticación, autorización, CSRF, validación y errores
├── migrations/      Migraciones versionadas de Sequelize
├── models/          Modelos y asociaciones Sequelize
├── public/          CSS y JavaScript del cliente
├── routes/          Declaración de rutas y middlewares
├── scripts/         Inicialización, comprobación y administración
├── services/        Reglas de negocio
├── tests/           Pruebas de humo, integridad e integración
├── views/           Plantillas EJS y parciales
├── app.js           Configuración de Express
├── server.js        Punto de entrada local
├── vercel.json      Configuración de Vercel Functions
├── .vercelignore    Exclusiones del despliegue
└── package.json
```

La arquitectura sigue el patrón **MVC con servicios**: las rutas solo
declaran endpoints, los controladores coordinan, los servicios contienen
las reglas de negocio y los modelos representan la persistencia.

## Roles y permisos

### `user` (estudiante)

- Registrarse e iniciar/cerrar sesión.
- Crear, listar, consultar, editar y eliminar **sus propias** tareas.
- Cambiar el estado de sus tareas y filtrarlas.
- **No** puede ver ni modificar tareas de otros usuarios.

### `admin`

- Iniciar y cerrar sesión.
- Consultar todas las tareas y sus detalles.
- Identificar al propietario de cada tarea.
- Eliminar cualquier tarea.
- Consultar el listado de usuarios registrados (sin contraseñas ni
  hashes).

El registro público siempre crea usuarios con rol `user`. Para crear un
administrador local:

```bash
npm run create-admin
```

El script solicita nombre, correo y contraseña. También acepta
`ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` para ejecución no
interactiva. No guardes esas variables en archivos del proyecto.

En Vercel no hay Shell. Define `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`
como variables de entorno del proyecto; la inicialización de la función
ejecutará `bootstrap-admin` antes de la primera petición. Como la base SQLite
de Vercel es efímera, el administrador se recrea en cada instancia nueva.
Consulta [DEPLOYMENT.md](DEPLOYMENT.md) para el procedimiento y las
limitaciones de persistencia.

## Rutas principales

| Método | Ruta | Acceso |
| --- | --- | --- |
| `GET` | `/` | Público |
| `GET` / `POST` | `/register` | Público |
| `GET` / `POST` | `/login` | Público |
| `POST` | `/logout` | Autenticado |
| `GET` | `/dashboard` | Autenticado |
| `GET` | `/tasks` | `user` |
| `GET` | `/tasks/create` | `user` |
| `POST` | `/tasks` | `user` |
| `GET` | `/tasks/:id` | `user` (propietario) |
| `GET` | `/tasks/:id/edit` | `user` (propietario) |
| `POST` | `/tasks/:id/update` | `user` (propietario) |
| `POST` | `/tasks/:id/delete` | `user` (propietario) |
| `POST` | `/tasks/:id/status` | `user` (propietario) |
| `GET` | `/admin/tasks` | `admin` |
| `GET` | `/admin/tasks/:id` | `admin` |
| `POST` | `/admin/tasks/:id/delete` | `admin` |
| `GET` | `/admin/users` | `admin` |

Las operaciones mutables usan `POST`; nunca se modifica estado con `GET`.

## Base de datos

El esquema se compone de dos entidades:

```text
users                         tasks
─────────────────             ─────────────────
id            PK              id            PK
name                          title
email         UNIQUE          description
password      (hash)          subject
role          user|admin      due_date
created_at                    status        pending|completed
                              user_id       FK → users.id
                              created_at
                              updated_at
```

Relación: `User hasMany Task` / `Task belongsTo User`.

- El archivo por defecto es `data/studytask.db`.
- La carpeta `data/` se crea automáticamente.
- En Vercel se usa `/tmp/studytask.db` automáticamente; ese archivo es
  efímero, no se comparte entre instancias y se pierde al reiniciar o
  redesplegar. Es válido solo para una demostración.
- En Alwaysdata, `DATABASE_STORAGE` apunta a una ruta absoluta dentro de la
  cuenta y el archivo persiste entre reinicios.
- Los archivos SQLite están excluidos mediante `.gitignore`; nunca deben
  subirse al repositorio.
- Las migraciones viven en `migrations/` y se ejecutan con
  `npm run db:migrate`.
- `npm run db:init` prepara la carpeta y aplica las migraciones
  pendientes (es idempotente).
- Las restricciones de integridad se mantienen en SQLite: correo único,
  claves foráneas, `ON DELETE RESTRICT`, `ON UPDATE CASCADE`, índices y
  restricciones `CHECK` para rol y estado.

## Seguridad

- Contraseñas hasheadas con **bcrypt** antes de guardarlas.
- Comparación de contraseñas mediante la función de verificación de
  bcrypt.
- **JWT** firmado con un secreto de entorno y verificado en cada
  solicitud protegida.
- Cookie de sesión `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Duración de la cookie coherente con la expiración del JWT.
- Limpieza correcta de la cookie al cerrar sesión.
- Protección **CSRF** en operaciones mutables (token por formulario).
- Validación y normalización de entradas en el servidor.
- Autorización por rol y comprobación de propiedad del recurso.
- El propietario de una tarea se obtiene de la sesión autenticada, nunca
  del `user_id` enviado por el navegador.
- El registro público no puede asignar el rol `admin`.
- Las vistas nunca reciben contraseñas ni hashes.
- Los errores no exponen detalles internos, tokens ni secretos.
- Consultas parametrizadas a través del ORM; sin concatenar SQL con
  entradas del usuario.

## Pruebas

```bash
npm test                   # Humo + integridad de base de datos + integración
npm run test:smoke         # Servidor, vistas y rutas básicas
npm run test:database      # Restricciones e integridad del esquema
npm run test:integration   # Flujo completo de registro, login y tareas
npm run test:production    # Cookies Secure, HSTS y CSP
```

Las pruebas utilizan la base configurada y eliminan únicamente los
usuarios y tareas temporales que crean. **No las ejecutes contra una base
de producción real.**

## Despliegue

La guía completa está en [DEPLOYMENT.md](DEPLOYMENT.md).

La opción elegida es **Vercel Hobby**, que no exige método de pago para un
proyecto académico y publica la aplicación con HTTPS. La configuración
preparada incluye:

- `api/index.js` como función serverless que reutiliza la aplicación Express.
- `scripts/serverlessInit.js`, que crea la base, ejecuta las migraciones y
  crea el administrador opcional antes de la primera petición.
- `vercel.json` con `maxDuration`, los archivos que acompañan a la función y
  la reescritura de todas las rutas hacia `/api`.
- `.vercelignore` para no subir `.env`, la base local ni archivos ajenos al
  despliegue.
- Variables `JWT_SECRET` y `CSRF_SECRET` propias del entorno de Vercel.

> **Limitación:** Vercel Functions solo permite escribir en `/tmp`, que es
> efímero y distinto por instancia. Por eso `DATABASE_STORAGE` se resuelve a
> `/tmp/studytask.db`: la aplicación funciona para una demostración, pero los
> usuarios y las tareas se pierden en cada cold start o redespliegue. Para
> persistencia real se necesita una base gestionada o un host con disco
> persistente.

`render.yaml` se eliminó: Render exige un método de pago de verificación
incluso con su plan Free y su almacenamiento gratuito también es efímero. No
se creó ningún recurso en Render.

> **Estado:** la configuración para Vercel está lista, pero falta importar el
> repositorio y definir las variables de entorno para obtener una URL pública.
> No afirmes que el despliegue está terminado hasta completar las
> comprobaciones de `DEPLOYMENT.md`.

## Documentación

| Documento | Contenido |
| --- | --- |
| [docs/SRS.md](docs/SRS.md) | Requisitos funcionales y no funcionales. |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura MVC, capas y flujo de solicitudes. |
| [docs/DATABASE.md](docs/DATABASE.md) | Entidades, columnas, restricciones y relaciones. |
| [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) | Fases de desarrollo y criterios de aceptación. |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Despliegue paso a paso en Vercel. |

---

Proyecto académico desarrollado como trabajo final del curso de
**Node.js**. La interfaz está en español y el código en inglés.
