# StudyTask --- Arquitectura

**Versión:** 1.1\
**Estado:** Implementado con SQLite; despliegue público pendiente

## 1. Objetivo arquitectónico

Definir una arquitectura sencilla, modular y mantenible que cumpla el
requisito MVC del trabajo final y permita separar presentación, control
de solicitudes, reglas de negocio y persistencia.

Se utilizará MVC con una capa de servicios. La capa de servicios
complementa MVC; no lo sustituye.

## 2. Stack tecnológico aprobado

  Tecnología          Uso
  ------------------- ------------------------------------
  Node.js 24 LTS      Entorno de ejecución
  Express             Servidor web y routing
  SQLite              Base de datos relacional en archivo local
  sqlite3             Driver SQLite de Sequelize
  Sequelize           ORM
  EJS                 Renderizado de vistas
  Bootstrap           Diseño responsive
  JWT                 Identidad autenticada
  bcrypt              Hash y verificación de contraseñas
  dotenv              Variables de entorno
  express-validator   Validación de entradas
  cookie-parser       Lectura de cookies
  helmet              Cabeceras HTTP de seguridad

Se conserva Sequelize porque los modelos, asociaciones, servicios y
migraciones ya dependen de su API. Sequelize 6 carga el driver `sqlite3`
para el dialecto SQLite; `better-sqlite3` no es compatible directamente
con esta versión del ORM.

Se elige una solución CSRF mantenida y compatible con las versiones de
Express seleccionadas. No se debe asumir que paquetes antiguos siguen
siendo adecuados.

## 3. Estilo arquitectónico

Arquitectura MVC con servicios:

-   **Model:** entidades, relaciones y persistencia mediante Sequelize.
-   **View:** plantillas EJS y componentes parciales.
-   **Controller:** coordina solicitudes, servicios y respuestas.
-   **Service:** implementa reglas de negocio.
-   **Middleware:** autenticación, autorización, validación, CSRF y
    errores.
-   **Config:** configuración de base de datos y entorno.

## 4. Estructura de carpetas

``` text
studytask/
├── config/
│   ├── config.js
│   ├── database.js
│   ├── databasePath.js
│   └── environment.js
├── controllers/
│   ├── authController.js
│   ├── taskController.js
│   └── adminController.js
├── services/
│   ├── authService.js
│   ├── taskService.js
│   └── adminService.js
├── middlewares/
│   ├── authenticate.js
│   ├── authorize.js
│   ├── validate.js
│   ├── csrf.js
│   └── errorHandler.js
├── models/
│   ├── index.js
│   ├── User.js
│   └── Task.js
├── routes/
│   ├── authRoutes.js
│   ├── taskRoutes.js
│   └── adminRoutes.js
├── views/
│   ├── layouts/
│   │   └── main.ejs
│   ├── partials/
│   │   ├── header.ejs
│   │   ├── footer.ejs
│   │   ├── navbar.ejs
│   │   └── messages.ejs
│   ├── auth/
│   │   ├── login.ejs
│   │   └── register.ejs
│   ├── tasks/
│   │   ├── index.ejs
│   │   ├── show.ejs
│   │   ├── create.ejs
│   │   └── edit.ejs
│   ├── admin/
│   │   ├── tasks.ejs
│   │   └── users.ejs
│   └── error.ejs
├── public/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── main.js
├── scripts/
│   ├── checkDatabase.js
│   ├── createAdmin.js
│   └── initDatabase.js
├── data/
│   └── .gitkeep
├── tests/
├── docs/
├── .env
├── .env.example
├── .gitignore
├── app.js
├── server.js
├── package.json
└── README.md
```

La estructura puede ajustarse si una necesidad técnica real lo
justifica, pero no se deben añadir carpetas o capas sin motivo.

## 5. Responsabilidades por componente

### 5.1 Configuración

`config/database.js` - Crear la instancia Sequelize. - Configurar SQLite
con el driver `sqlite3`. - Exportar la conexión.

`config/databasePath.js` - Resolver la ruta de `DATABASE_STORAGE`. -
Aplicar el valor por defecto `data/studytask.db`.

`config/config.js` - Proporcionar la configuración de Sequelize CLI para
entornos `development`, `test` y `production`.

`config/environment.js` - Leer y validar variables de entorno. - Fallar
de forma clara si falta una variable obligatoria.

### 5.2 Modelos

`models/User.js` - Definir los atributos del usuario. - Definir
restricciones de correo y rol.

`models/Task.js` - Definir los atributos de la tarea. - Definir estado y
clave foránea.

`models/index.js` - Inicializar modelos. - Declarar asociaciones. -
Exportar modelos y conexión.

### 5.3 Servicios

`authService.js` - Registrar usuarios. - Buscar usuarios para login. -
Verificar contraseñas. - Crear tokens JWT.

`taskService.js` - Crear tareas. - Listar tareas propias. - Obtener una
tarea propia. - Actualizar y eliminar tareas propias. - Cambiar
estado. - Aplicar filtro por estado.

`adminService.js` - Listar tareas globales. - Consultar una tarea
global. - Eliminar cualquier tarea. - Listar usuarios sin atributos
sensibles.

### 5.4 Controladores

Los controladores: - Leerán parámetros, body y usuario autenticado. -
Invocarán servicios. - Gestionarán redirecciones y renderizado EJS. - No
contendrán consultas SQL ni reglas de negocio complejas.

### 5.5 Rutas

Las rutas: - Declararán métodos y paths. - Aplicarán middlewares en el
orden adecuado. - Asociarán validaciones y controladores. - No
contendrán lógica de negocio.

### 5.6 Middlewares

`authenticate.js` - Leer cookie JWT. - Verificar firma y expiración. -
Cargar la identidad autenticada en `req.user`. - Rechazar solicitudes no
autenticadas.

`authorize.js` - Comprobar roles permitidos.

`validate.js` - Ejecutar y comprobar validaciones de entrada.

`csrf.js` - Aplicar protección CSRF a operaciones mutables autenticadas
por cookie.

`errorHandler.js` - Gestionar errores centralizadamente. - Evitar
revelar detalles internos en producción.

## 6. Flujo de una solicitud autenticada

1.  El navegador envía la cookie.
2.  Express recibe la solicitud.
3.  El middleware de autenticación verifica el JWT.
4.  Se establece `req.user` con identidad y rol verificados.
5.  Se ejecutan autorización y validación cuando correspondan.
6.  El controlador invoca el servicio.
7.  El servicio aplica reglas de negocio y usa Sequelize.
8.  Sequelize consulta o modifica el archivo SQLite.
9.  El controlador renderiza EJS o redirige.
10. Express devuelve la respuesta.

## 7. Autenticación y sesión

### 7.1 Login

1.  Recibir correo y contraseña.
2.  Buscar usuario por correo.
3.  Comparar contraseña con bcrypt.
4.  Firmar JWT usando `JWT_SECRET`.
5.  Incluir únicamente identificador y rol necesarios, además de los
    claims estándar.
6.  Establecer cookie HttpOnly.

### 7.2 Atributos de cookie

-   `httpOnly: true`.
-   `secure: true` en producción.
-   `sameSite: 'lax'` como configuración inicial.
-   `path: '/'`.
-   `maxAge` coherente con la expiración JWT.

El nombre de cookie se configurará mediante entorno.

### 7.3 Logout

Eliminar la cookie con los mismos atributos relevantes usados al
crearla. Al ser JWT stateless, borrar la cookie del navegador elimina la
sesión de ese navegador, pero no revoca una copia del token robada antes
de su expiración. No se implementará una lista de revocación en la
primera versión.

## 8. Autorización y propiedad de recursos

Para operaciones de estudiante, las consultas deben incluir tanto el ID
de la tarea como el ID del usuario autenticado.

Ejemplo conceptual: - Buscar tarea donde `id = taskId` y
`user_id = req.user.id`.

No se debe: - Buscar la tarea solo por ID y confiar en que el formulario
pertenece al usuario. - Aceptar `user_id` del body para asignar
propietario. - Confiar en el rol enviado por el navegador.

Las rutas administrativas deben requerir explícitamente el rol `admin`.

## 9. Rutas iniciales

### Autenticación

  Método   Ruta          Acceso
  -------- ------------- -------------
  GET      `/register`   Público
  POST     `/register`   Público
  GET      `/login`      Público
  POST     `/login`      Público
  POST     `/logout`     Autenticado

### Tareas

  Método   Ruta                  Acceso
  -------- --------------------- --------
  GET      `/tasks`              user
  GET      `/tasks/create`       user
  POST     `/tasks`              user
  GET      `/tasks/:id`          user
  GET      `/tasks/:id/edit`     user
  POST     `/tasks/:id/update`   user
  POST     `/tasks/:id/delete`   user
  POST     `/tasks/:id/status`   user

### Administración

  Método   Ruta                        Acceso
  -------- --------------------------- --------
  GET      `/admin/tasks`              admin
  GET      `/admin/tasks/:id`          admin
  POST     `/admin/tasks/:id/delete`   admin
  GET      `/admin/users`              admin

Las operaciones mutables usan POST en esta especificación inicial para
simplificar formularios HTML EJS. No usar GET para modificar datos.

## 10. Configuración y secretos

`.env.example` documentará:

``` env
PORT=3000
NODE_ENV=development
DATABASE_STORAGE=data/studytask.db
JWT_SECRET=
CSRF_SECRET=
JWT_EXPIRES_IN=1h
COOKIE_NAME=studytask_token
BCRYPT_ROUNDS=12
```

La configuración de cookie se derivará del entorno. No se guardarán
secretos reales en `.env.example`.

En producción: - `NODE_ENV=production`. - HTTPS activo. - Cookie
`Secure`. - Secreto JWT fuerte. - Archivo SQLite en un volumen
persistente. - No exponer stack traces al usuario.

## 11. Seguridad adicional

-   Validar y normalizar entradas.
-   Limitar longitud de campos.
-   Usar Helmet.
-   Aplicar protección CSRF en formularios mutables.
-   Escapar contenido en EJS usando la salida escapada.
-   No renderizar contenido de usuario como HTML confiable.
-   Evitar logs de datos sensibles.
-   Gestionar errores de forma centralizada.

## 12. Despliegue

Plataforma prevista: Render.

Componentes: - Servicio web Node.js. - Archivo SQLite en `/tmp` para el
plan gratuito. - Variables de entorno. - HTTPS. - Comando de inicio de
producción que ejecuta las migraciones y el bootstrap opcional del
administrador.

El plan **Free** de Render no ofrece discos persistentes ni Shell. El
`render.yaml` usa `DATABASE_STORAGE=/tmp/studytask.db`; la base funciona,
pero se pierde en cada reinicio o redespliegue. Para persistencia real se
necesita un plan de pago con un disco montado en `/var/data` y cambiar
`DATABASE_STORAGE` a `/var/data/studytask.db`.

El administrador inicial se puede crear sin Shell con
`npm run bootstrap-admin` y las variables `ADMIN_NAME`, `ADMIN_EMAIL` y
`ADMIN_PASSWORD`; `start:production` ejecuta ese paso antes de iniciar el
servidor. La estrategia de migraciones está definida: `npm run db:init`
crea el archivo si falta y ejecuta las migraciones versionadas de
`migrations/`. No se debe depender de `sequelize.sync({ alter: true })`
como mecanismo de migración permanente.

## 13. Decisiones de implementación resueltas

-   Dependencias verificadas con Node.js 24.
-   Solución CSRF: `csrf-csrf` con cookie de sesión y token por
    formulario.
-   Migraciones versionadas con `sequelize-cli` y `npm run db:init`.
-   Primer administrador mediante `npm run create-admin` en local y
    `npm run bootstrap-admin` en entornos sin Shell.
-   Errores 401/403/404 representados con las vistas y mensajes
    existentes, sin exponer detalles internos.
-   Driver SQLite: `sqlite3` por compatibilidad con Sequelize 6.
