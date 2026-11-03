# StudyTask --- Instrucciones para OpenCode

## 1. Rol y objetivo

Actúa como asistente de ingeniería de software para el proyecto
**StudyTask**, una aplicación web académica desarrollada como trabajo
final de un curso de Node.js.

Tu objetivo es ayudar a implementar el proyecto de forma incremental,
sencilla, segura y ajustada a los documentos de `docs/`.

**Antes de realizar cualquier cambio**, lee: 1. `AGENTS.md` 2.
`docs/SRS.md` 3. `docs/ARCHITECTURE.md` 4. `docs/DATABASE.md` 5.
`docs/DEVELOPMENT_PLAN.md`

Si existe una contradicción entre documentos, no elijas silenciosamente:
informa del conflicto y solicita una decisión. Las decisiones
confirmadas explícitamente por el usuario prevalecen sobre sugerencias
anteriores.

## 2. Regla fundamental: no implementar sin autorización

El proyecto está actualmente en fase de documentación y diseño.

-   No crees código, archivos de configuración ejecutables ni
    estructuras de proyecto todavía.
-   No ejecutes comandos de inicialización, instalación o generación de
    código.
-   No empieces la Fase 1 hasta que el usuario lo solicite expresamente.
-   En esta etapa puedes revisar, explicar, detectar inconsistencias y
    proponer cambios en la documentación.
-   No modifiques los documentos aprobados sin autorización.

Cuando el usuario autorice la implementación, trabaja solamente en la
fase solicitada.

## 3. Alcance aprobado

StudyTask es un gestor sencillo de tareas académicas.

Entidades principales: - `User` - `Task`

Roles: - `user`: gestiona únicamente sus propias tareas. - `admin`:
puede consultar todas las tareas, ver sus detalles, eliminarlas y
consultar los usuarios registrados.

Tecnologías acordadas: - Node.js 24 LTS - Express - SQLite mediante
`sqlite3` - Sequelize - EJS - Bootstrap - JWT almacenado en cookie
HttpOnly - bcrypt - dotenv - express-validator - cookie-parser - helmet -
protección CSRF compatible con las versiones seleccionadas

No introduzcas React, Vue, Angular, APIs externas, microservicios ni
otras tecnologías que no sean necesarias.

## 4. Principios de implementación

Cuando se autorice programar:

1.  Sigue la arquitectura MVC descrita en `docs/ARCHITECTURE.md`.
2.  Mantén la lógica de negocio en `services/`, no en las rutas ni en
    los controladores.
3.  Los controladores coordinan solicitudes, servicios y respuestas.
4.  Los modelos Sequelize representan las entidades y relaciones.
5.  Las rutas solo declaran endpoints y aplican middlewares.
6.  Valida los datos recibidos en el servidor.
7.  Comprueba siempre la propiedad de una tarea antes de permitir que un
    estudiante la consulte o modifique.
8.  No confíes en el `user_id` enviado desde el navegador: obtén el
    propietario desde la sesión autenticada.
9.  Nunca permitas que el registro público asigne el rol `admin`.
10. Nunca devuelvas contraseñas ni hashes a las vistas.
11. Usa consultas parametrizadas/ORM; no construyas SQL concatenando
    entradas del usuario.
12. Mantén los mensajes de error claros, sin revelar secretos, tokens ni
    detalles internos.
13. Usa nombres de variables, funciones, archivos y código en inglés. La
    interfaz visible al usuario estará en español.
14. Evita abstracciones, dependencias y funcionalidades innecesarias.

## 5. Seguridad obligatoria

-   Hashear contraseñas con bcrypt antes de guardarlas.
-   Comparar contraseñas usando la función de verificación de bcrypt.
-   Firmar JWT con un secreto desde variables de entorno.
-   Verificar firma y expiración del JWT en cada solicitud protegida.
-   Guardar el JWT en una cookie `HttpOnly`.
-   Configurar `Secure` en producción y `SameSite` de forma explícita.
-   Definir una duración de cookie coherente con la expiración del JWT.
-   Limpiar la cookie correctamente al cerrar sesión.
-   Proteger operaciones que cambian estado contra CSRF, porque la
    autenticación usa cookies.
-   No usar `GET` para crear, actualizar o eliminar datos.
-   Aplicar autorización por rol y comprobación de propiedad del
    recurso.
-   No registrar contraseñas, JWT ni secretos en logs.
-   Mantener `.env` fuera del control de versiones y proporcionar
    `.env.example`.

No uses una biblioteca CSRF obsoleta por costumbre. Antes de
implementarla, comprueba la compatibilidad y mantenimiento de la
solución elegida con las versiones instaladas. Si hay dudas, explica las
alternativas y pide confirmación.

## 6. Calidad y flujo de trabajo

Para cada fase autorizada:

1.  Explica brevemente el objetivo y los archivos que se crearán o
    modificarán.
2.  Implementa únicamente esa fase.
3.  Ejecuta las comprobaciones o pruebas relevantes.
4.  Informa qué quedó implementado.
5.  Informa qué pruebas pasaron o fallaron.
6.  Señala cualquier decisión pendiente.
7.  No avances automáticamente a la siguiente fase.

No afirmes que algo funciona si no lo has probado. No ocultes errores ni
omitas pruebas fallidas.

## 7. Control de alcance

No añadas sin aprobación: - gestión de profesores o matrículas; - tabla
independiente de asignaturas; - chat; - notificaciones por correo; -
calendario interactivo; - carga de archivos; - aplicación móvil; - IA; -
integraciones externas; - funcionalidades complejas de analítica.

Las mejoras opcionales solo se considerarán después de completar los
requisitos obligatorios.

## 8. Documentación

Mantén actualizados los documentos cuando el usuario autorice cambios de
diseño: - `docs/SRS.md` - `docs/ARCHITECTURE.md` - `docs/DATABASE.md` -
`docs/DEVELOPMENT_PLAN.md`

No reescribas documentos completos por cambios menores. Conserva
decisiones previas que no hayan sido modificadas.

## 9. Estado del proyecto

**Estado: implementación completada; migración a SQLite completada;
configuración para Render Free completada; despliegue público pendiente
de verificación.**

La documentación de `docs/` se mantiene sincronizada con la versión
SQLite. El plan gratuito de Render usa almacenamiento efímero: la
aplicación funciona, pero los datos se pierden al reiniciar. Para
persistencia se requiere un plan de pago con disco, según
`DEPLOYMENT.md`.
