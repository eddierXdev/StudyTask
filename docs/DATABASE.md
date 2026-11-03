# StudyTask --- Diseño de base de datos

**Motor:** PostgreSQL\
**ORM:** Sequelize\
**Versión del diseño:** 1.0

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

  Columna      Tipo PostgreSQL orientativo   Nulo   Restricciones
  ------------ ----------------------------- ------ ----------------------------------
  id           INTEGER                       No     PK, autoincremental
  name         VARCHAR(100)                  No     ---
  email        VARCHAR(255)                  No     UNIQUE
  password     VARCHAR(255)                  No     Hash bcrypt
  role         VARCHAR(20) o ENUM            No     `user` / `admin`, default `user`
  created_at   TIMESTAMP                     No     Fecha de creación

### Reglas

-   El correo debe ser único.
-   Se recomienda normalizar el correo a minúsculas antes de guardar y
    buscar.
-   La contraseña guardada será exclusivamente un hash bcrypt.
-   El rol por defecto será `user`.
-   El formulario público nunca podrá establecer `admin`.

## 4. Tabla tasks

  -----------------------------------------------------------------------
  Columna           Tipo PostgreSQL   Nulo              Restricciones
                    orientativo                         
  ----------------- ----------------- ----------------- -----------------
  id                INTEGER           No                PK,
                                                        autoincremental

  title             VARCHAR(150)      No                ---

  description       TEXT              Sí                ---

  subject           VARCHAR(100)      Sí                ---

  due_date          DATE              Sí                ---

  status            VARCHAR(20) o     No                `pending` /
                    ENUM                                `completed`,
                                                        default `pending`

  user_id           INTEGER           No                FK a users.id

  created_at        TIMESTAMP         No                Fecha de creación

  updated_at        TIMESTAMP         No                Última
                                                        actualización
  -----------------------------------------------------------------------

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

En Sequelize: - `User.hasMany(Task, { foreignKey: 'user_id' })` -
`Task.belongsTo(User, { foreignKey: 'user_id' })`

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

Los valores de `role` y `status` deben validarse tanto en la aplicación
como, cuando sea razonable, mediante restricciones de base de datos.

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
-   Los timestamps de creación y actualización se gestionarán mediante
    Sequelize.

## 10. Migraciones

Durante desarrollo se podrá utilizar una estrategia controlada de
sincronización local, pero la base de datos de producción debe
evolucionar mediante migraciones versionadas.

No utilizar `sync({ force: true })` con datos reales. No usar
`sync({ alter: true })` como sustituto permanente de migraciones de
producción.

## 11. Fuera del modelo inicial

No crear tablas para: - Subjects. - Teachers. - Courses. -
Enrollments. - Notifications. - Attachments.

La asignatura será un campo de texto opcional en `tasks.subject`.
