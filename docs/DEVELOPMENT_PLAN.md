# StudyTask --- Plan de desarrollo

**Estado actual:** Implementación completada con SQLite; despliegue
público pendiente de verificación.\
**Objetivo:** Completar los requisitos obligatorios del proyecto final
con el menor alcance razonable.

## 1. Reglas de trabajo

-   Implementar una fase a la vez.
-   No comenzar una fase sin autorización del usuario.
-   No añadir funcionalidades no aprobadas.
-   Al terminar cada fase, ejecutar comprobaciones y explicar
    resultados.
-   No declarar una fase completada si no se verificó.
-   Mantener SRS, arquitectura y base de datos sincronizados con las
    decisiones aprobadas.

## 2. Fases

### Fase 0 --- Documentación y diseño

Entregables: - `docs/SRS.md` - `docs/ARCHITECTURE.md` -
`docs/DATABASE.md` - `docs/DEVELOPMENT_PLAN.md`

Criterio de salida: - Alcance y decisiones técnicas revisados por el
usuario.

Estado: **Aprobado**.

### Fase 1 --- Inicialización y configuración

Objetivos: - Inicializar proyecto Node.js. - Configurar
`package.json`. - Crear estructura de carpetas. - Configurar Express. -
Configurar EJS y archivos estáticos. - Configurar dotenv y validación de
entorno. - Crear `app.js` y `server.js`. - Añadir `.gitignore` y
`.env.example`.

Criterios de aceptación: - El servidor inicia. - EJS renderiza una vista
de prueba. - Los archivos estáticos se sirven. - No hay secretos en el
repositorio.

### Fase 2 --- SQLite y Sequelize

Objetivos: - Configurar conexión SQLite con `sqlite3`. - Definir modelos
User y Task. - Definir relación 1:N. - Configurar migraciones. -
Verificar persistencia.

Criterios: - La conexión funciona sin servidor externo. - Las tablas se
crean mediante migraciones. - La relación, los índices y las
restricciones funcionan. - El archivo SQLite persiste entre reinicios.

Estado: **Completada con SQLite**.

### Fase 3 --- Registro y autenticación

Objetivos: - Implementar registro. - Validar campos. - Hash bcrypt. -
Login. - Generación y verificación JWT. - Cookie HttpOnly. - Logout.

Criterios: - Registro válido crea usuario `user`. - Correo duplicado se
rechaza. - Contraseña se almacena hasheada. - Credenciales inválidas no
crean sesión. - Cookie tiene atributos adecuados. - Logout limpia la
cookie.

### Fase 4 --- Autorización y seguridad

Objetivos: - Middleware de autenticación. - Middleware de roles. -
Protección CSRF. - Manejo de errores. - Protección de propiedad de
tareas.

Criterios: - Usuario anónimo no accede a rutas privadas. - Usuario
normal no accede a rutas admin. - Usuario no puede acceder a tareas
ajenas. - Solicitudes mutables sin token CSRF válido se rechazan.

### Fase 5 --- CRUD de tareas

Objetivos: - Crear tarea. - Listar tareas propias. - Consultar
detalle. - Editar. - Eliminar. - Cambiar estado. - Filtrar por estado.

Criterios: - Todas las operaciones persisten en SQLite. - Campos
obligatorios y opcionales se respetan. - El estado inicial es
`pending`. - El filtro distingue `pending` y `completed`. - Las tareas
sin fecha límite se ordenan al final. - No hay acceso cruzado entre
usuarios.

### Fase 6 --- Administración

Objetivos: - Listado global de tareas. - Detalle global. - Eliminación
administrativa. - Listado de usuarios.

Criterios: - Solo admin puede acceder. - Admin puede consultar tareas de
distintos propietarios. - Admin puede eliminar tareas. - La vista de
usuarios nunca muestra hashes.

### Fase 7 --- Vistas y experiencia de usuario

Objetivos: - Layout principal. - Partials. - Login y registro. - Listado
y detalle de tareas. - Formularios de creación y edición. - Panel
administrativo. - Mensajes de validación y errores. - Bootstrap
responsive.

Criterios: - Navegación coherente. - Formularios utilizables. - Mensajes
claros. - Interfaz funcional en escritorio y móvil.

### Fase 8 --- Pruebas y revisión

Objetivos: - Probar autenticación. - Probar autorización. - Probar
CRUD. - Probar validaciones. - Probar errores. - Revisar seguridad
básica.

Pruebas mínimas: - Registro correcto y duplicado. - Login correcto e
incorrecto. - Acceso anónimo a rutas privadas. - Acceso user a rutas
admin. - Acceso a tarea propia y ajena. - CRUD completo. - Filtros. -
CSRF. - Logout.

### Fase 9 --- Despliegue

Objetivos: - Preparar SQLite para Vercel Hobby. - Configurar una Vercel
Function con la aplicación Express. - Configurar variables de entorno. -
Ejecutar migraciones en la primera petición. - Crear el administrador sin
Shell. - Verificar HTTPS y cookies Secure. - Probar la aplicación publicada.

Criterios: - URL pública funcional. - Autenticación funciona en
producción. - No se exponen secretos. - La pérdida de datos por el
sistema de archivos efímero está documentada.

Estado: **Configuración para Vercel preparada; falta importar el
repositorio y definir las variables de entorno**. Vercel Functions solo
permite escribir en `/tmp`, que es efímero y propio de cada instancia; la
base SQLite vive en `/tmp/studytask.db` y se pierde en cada cold start o
redespliegue. El administrador se crea con las variables `ADMIN_*`. Render
se descartó porque exige un método de pago de verificación incluso con su
plan Free y su almacenamiento gratuito también es efímero.

### Fase 10 --- Entrega

Entregables: - Repositorio GitHub. - Aplicación desplegada. - README con
descripción, tecnologías, funcionalidades e instalación. - Evidencia
visual opcional.

Estado: **README completado; aplicación desplegada pendiente**.

## 3. Mejoras opcionales

Solo después de completar los requisitos obligatorios: - Paginación. -
Búsqueda por título. - Tests automatizados con Jest y Supertest. -
Dockerización.

No iniciar estas mejoras si ponen en riesgo la finalización de los
requisitos obligatorios.

## 4. Seguimiento

Al finalizar cada fase, registrar: - Qué se implementó. - Archivos
creados o modificados. - Pruebas ejecutadas. - Resultado de las
pruebas. - Problemas pendientes. - Confirmación del usuario para
avanzar.

## 5. Estado

  Fase                 Estado
  -------------------- -----------
  0\. Documentación    Aprobada
  1\. Inicialización   Completada
  2\. Base de datos    Completada (SQLite)
  3\. Autenticación    Completada
  4\. Seguridad        Completada
  5\. CRUD             Completada
  6\. Administración   Completada
  7\. Vistas           Completada
  8\. Pruebas          Completada
  9\. Despliegue       Configuración Vercel lista; pendiente de URL pública
  10\. Entrega         README listo; despliegue pendiente
