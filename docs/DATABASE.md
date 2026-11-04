# StudyTask --- Diseño de base de datos

**Motor:** SQLite (archivo local)\
**ORM:** Sequelize 6 con driver `sqlite3`\
**Versión del diseño:** 1.1

## 1. Objetivo

Definir las entidades, columnas, restricciones y relaciones de la base
de datos de StudyTask.

La primera versión utilizará únicamente dos entidades principales:
`User` y `Task`.

## 2. Diagrama relacional

``` text
+-----------------------+
|         users         |
+-----------------------+
| id          PK        |
| name                  |
| email       UNIQUE    |
| password              |
| role                  |
| created_at            |
+-----------------------+
            |
            | 1
            |
            | N
+-----------------------+
|         tasks         |
+-----------------------+
| id          PK        |
| title                 |
| description           |
| subject               |
| due_date              |
| status                |
| user_id     FK        |
| created_at            |
| updated_at            |
+-----------------------+
```

Relación: `User hasMany Task`; `Task belongsTo User`.

## 3. Tabla users

| Columna | Tipo SQLite orientativo | Nulo | Restricciones |
| --- | --- | --- | --- |
| `id` | `INTEGER` | No | PK, autoincremental |
| `name` | `VARCHAR(100)` | No | --- |
| `email` | `VARCHAR(255)` | No | UNIQUE |
| `password` | `VARCHAR(255)` | No | Hash bcrypt |
| `role` | `VARCHAR(20)` | No | `user` / `admin`, default `user`, CHECK `users_role_check` |
| `created_at` | `DATETIME` | No | Fecha de creación |

### Reglas

-   El correo debe ser único.
-   Se recomienda normalizar el correo a minúsculas antes de guardar y
    buscar.
-   La contraseña guardada será exclusivamente un hash bcrypt.
-   El rol por defecto será `user`.
-   El formulario público nunca podrá establecer `admin`.

## 4. Tabla tasks

| Columna | Tipo SQLite orientativo | Nulo | Restricciones |
| --- | --- | --- | --- |
| `id` | `INTEGER` | No | PK, autoincremental |
| `title` | `VARCHAR(150)` | No | --- |
| `description` | `TEXT` | Sí | --- |
| `subject` | `VARCHAR(100)` | Sí | --- |
| `due_date` | `DATE` | Sí | --- |
| `status` | `VARCHAR(20)` | No | `pending` / `completed`, default `pending`, CHECK `tasks_status_check` |
| `user_id` | `INTEGER` | No | FK a `users.id`, ON DELETE RESTRICT, ON UPDATE CASCADE |
| `created_at` | `DATETIME` | No | Fecha de creación |
| `updated_at` | `DATETIME` | No | Última actualización |

### Reglas

-   Toda tarea debe tener un propietario.
-   El título es obligatorio.
-   La descripción, asignatura y fecha límite son opcionales.
-   El estado inicial es `pending`.
-   Solo se aceptan `pending` y `completed`.

## 5. Relaciones y claves foráneas

### User → Task

-   Cardinalidad: uno a muchos (1:N).
-   `users.id` es la clave primaria.
-   `tasks.user_id` es la clave foránea.

En Sequelize: - `User.hasMany(Task, { foreignKey: 'userId' })` -
`Task.belongsTo(User, { foreignKey: 'userId' })`; el atributo se mapea a
la columna `user_id`.

SQLite aplica las claves foráneas con `PRAGMA foreign_keys = ON`.
Sequelize activa esta opción al abrir la conexión. Las acciones son
`ON DELETE RESTRICT` y `ON UPDATE CASCADE`.

### Política de eliminación

No eliminar automáticamente las tareas cuando se elimina un usuario. La
política inicial será restringir la eliminación de un usuario que tenga
tareas asociadas, salvo que se defina un procedimiento administrativo
explícito. La primera versión no necesita una funcionalidad de
eliminación de usuarios.

## 6. Índices y restricciones

Como mínimo: - Índice único para `users.email`. - Índice para
`tasks.user_id`. - Índice para `tasks.status` si resulta útil para los
filtros.

La clave foránea `tasks.user_id` debe ser NOT NULL.

Los valores de `role` y `status` se validan en la aplicación y además
mediante restricciones de base de datos:

-   `users_role_check`: `role IN ('user', 'admin')`.
-   `tasks_status_check`: `status IN ('pending', 'completed')`.

Los índices se crean con las migraciones: `tasks_user_id_idx` y
`tasks_status_idx`. SQLite crea además el índice único automático para
`users.email`.

## 7. Consultas previstas

### Tareas de un estudiante

Condiciones: - `tasks.user_id = authenticatedUser.id`. - Orden sugerido:
fecha límite ascendente, dejando las fechas nulas al final; desempate
por creación descendente.

### Filtro por estado

Añadir condición `status` únicamente si el filtro recibido es uno de los
valores permitidos.

### Listado administrativo

Consultar tareas de todos los usuarios e incluir información no sensible
del propietario, por ejemplo nombre y correo. Nunca incluir `password`.

### Usuarios administrativos

Consultar usuarios excluyendo explícitamente el atributo `password`.

## 8. Seguridad de acceso a datos

-   No aceptar `user_id` desde el formulario como propietario.
-   Asignar `user_id` desde la identidad autenticada.
-   Para operaciones de estudiantes, incluir el propietario en la
    condición de consulta.
-   Para operaciones de administración, verificar rol `admin` antes de
    consultar o modificar.
-   No exponer hashes de contraseña en respuestas ni vistas.

## 9. Fechas

-   `due_date` representa una fecha límite, no una hora.
-   La interfaz debe mostrarla de forma consistente.
-   Evitar conversiones de zona horaria que cambien el día mostrado.
-   SQLite almacena `DATE` y `DATEONLY` como texto; Sequelize conserva el
    formato `AAAA-MM-DD`.
-   Los timestamps de creación y actualización se gestionan mediante
    Sequelize y se almacenan como `DATETIME`.

## 10. Migraciones

La base de datos se crea y evoluciona exclusivamente mediante las
migraciones versionadas de `migrations/`, ejecutadas con
`sequelize-cli`.

-   `npm run db:init` crea la carpeta y el archivo SQLite si faltan y
    aplica las migraciones pendientes.
-   `npm run db:migrate` aplica únicamente las migraciones pendientes.
-   `npm run db:migrate:status` muestra el estado.
-   No utilizar `sync({ force: true })` con datos reales.
-   No usar `sync({ alter: true })` como sustituto de migraciones.

Las migraciones adaptadas a SQLite usan `VARCHAR` y restricciones
`CHECK`, no tipos `ENUM` ni instrucciones `DROP TYPE` de PostgreSQL.

## 11. Archivo, persistencia y copias

-   La ubicación se configura con `DATABASE_STORAGE`; por defecto es
    `data/studytask.db`.
-   La carpeta se crea automáticamente y los archivos `.db` están
    excluidos de Git.
-   En local, el archivo persiste entre reinicios del servidor.
-   En Vercel se usa `/tmp/studytask.db`; el archivo es efímero, no se
    comparte entre instancias y se pierde al reiniciar o redesplegar. Es
    válido para una demostración, no para datos reales.
-   En Alwaysdata Free, `DATABASE_STORAGE` apunta a una ruta absoluta dentro
    de la cuenta y el archivo persiste entre reinicios; el plan incluye 1 GB
    de disco. Esa configuración se conserva como alternativa fuera de Vercel.
-   Para persistencia en producción se necesita un volumen persistente o una
    base gestionada.
-   SQLite no debe compartirse entre varias instancias o procesos que
    escriban el mismo archivo de forma simultánea.
-   Para copias de seguridad, usa el mecanismo de backup de SQLite o
    copia el archivo con el servicio detenido.

## 12. Fuera del modelo inicial

No crear tablas para: - Subjects. - Teachers. - Courses. -
Enrollments. - Notifications. - Attachments.

La asignatura será un campo de texto opcional en `tasks.subject`.
