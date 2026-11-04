# Despliegue de StudyTask en Vercel

StudyTask se despliega como una **Vercel Function** que ejecuta la aplicación
Express existente. El repositorio ya incluye la configuración necesaria:

- `api/index.js`: punto de entrada de la función serverless.
- `scripts/serverlessInit.js`: inicializa SQLite y el administrador opcional
  antes de la primera petición de cada instancia.
- `vercel.json`: duración máxima, archivos que deben acompañar a la función y
  reescritura de todas las rutas hacia la función.
- `.vercelignore`: evita subir secretos, la base local y archivos que no se
  usan en producción.

> **Estado actual:** la configuración está preparada, pero todavía no hay una
> URL pública. Falta importar el repositorio en Vercel y definir las variables
> de entorno. No afirmes que el despliegue funciona hasta completar la
> verificación de la sección 8.

## 1. Limitación importante: SQLite es efímero en Vercel

Vercel Functions tiene un sistema de archivos de **solo lectura**, excepto
`/tmp`. Ese directorio:

- Es **efímero**: se borra cuando la instancia se reinicia o se redespliega.
- Es **propio de cada instancia**: dos instancias no comparten el archivo.
- Tiene tamaño limitado y no está pensado para datos permanentes.

Por eso esta migración mantiene SQLite en `/tmp/studytask.db` únicamente para
una **demostración académica**. Consecuencias que debes conocer:

- Los usuarios y las tareas desaparecen tras un cold start o un redespliegue.
- Una petición puede llegar a otra instancia y no ver los datos creados en la
  anterior.
- No uses esta configuración para datos reales ni para varios usuarios
  simultáneos.

La aplicación sigue siendo válida para enseñar el flujo completo: registro,
login, CRUD, roles, CSRF y panel de administración. Si necesitas persistencia
real, consulta la sección 10.

## 2. Requisitos

- Cuenta gratuita en <https://vercel.com> (plan **Hobby**).
- Repositorio del proyecto en GitHub, GitLab o Bitbucket.
- Node.js 24 en local para ejecutar las pruebas.
- Opcional: Vercel CLI (`npm install -g vercel`) para desplegar desde la
  terminal.

El plan Hobby es gratuito y está pensado para proyectos personales o
académicos. No añadas datos de pago para este proyecto.

## 3. Variables de entorno

En **Project Settings > Environment Variables** (entorno **Production**),
define:

| Variable | Valor | Obligatoria |
| --- | --- | --- |
| `NODE_ENV` | `production` | No: Vercel la define automáticamente |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 caracteres | Sí |
| `CSRF_SECRET` | Otro secreto aleatorio de al menos 32 caracteres | Sí |
| `JWT_EXPIRES_IN` | `1h` | Sí |
| `COOKIE_NAME` | `studytask_token` | Sí |
| `BCRYPT_ROUNDS` | `12` | No (valor por defecto) |
| `DATABASE_STORAGE` | `/tmp/studytask.db` | No: se usa ese valor automáticamente en Vercel |
| `ADMIN_NAME` | Nombre del administrador inicial | No |
| `ADMIN_EMAIL` | Correo del administrador inicial | No |
| `ADMIN_PASSWORD` | Contraseña del administrador inicial | No |

Genera los secretos en local:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Usa el primer valor para `JWT_SECRET` y el segundo para `CSRF_SECRET`. No
reutilices los secretos de desarrollo y no los guardes en el repositorio.

`JWT_SECRET` y `CSRF_SECRET` deben ser iguales en todas las instancias y
redespliegues. Si los cambias, las sesiones y los formularios abiertos dejan de
ser válidos.

`DATABASE_STORAGE` se resuelve automáticamente a `/tmp/studytask.db` cuando
existe la variable `VERCEL`, que Vercel define en sus funciones. Si prefieres
ser explícito, define `DATABASE_STORAGE=/tmp/studytask.db`.

## 4. Desplegar desde el panel de Vercel

1. Sube los cambios al repositorio.
2. Entra en <https://vercel.com/new> e importa el repositorio.
3. Selecciona el proyecto y deja el **Root Directory** en la raíz.
4. No selecciones un framework: Vercel detecta la función de `api/`.
5. Añade las variables de entorno de la sección 3.
6. Pulsa **Deploy**.

Vercel instala las dependencias, empaqueta `api/index.js` con los archivos
indicados en `vercel.json` y publica la URL `https://<proyecto>.vercel.app`.

Cada push a la rama de producción vuelve a desplegar automáticamente.

## 5. Desplegar con Vercel CLI

```bash
npm install -g vercel
vercel login
vercel link
```

Añade las variables (la CLI pedirá el valor):

```bash
vercel env add JWT_SECRET production
vercel env add CSRF_SECRET production
vercel env add JWT_EXPIRES_IN production
vercel env add COOKIE_NAME production
```

Despliega a producción:

```bash
vercel --prod
```

Para probar un despliegue de vista previa, ejecuta `vercel` sin `--prod`.

## 6. Qué ocurre en la primera petición

`api/index.js` monta un middleware que, una sola vez por instancia:

1. Crea `/tmp/studytask.db` si no existe.
2. Ejecuta las migraciones de `migrations/` mediante `sequelize-cli`.
3. Ejecuta `bootstrap-admin` si están definidas `ADMIN_NAME`, `ADMIN_EMAIL` y
   `ADMIN_PASSWORD`.

Después delega en la aplicación Express de siempre. Las peticiones siguientes
de esa misma instancia reutilizan la base y no repiten las migraciones.

El primer acceso puede tardar algo más por el cold start, las migraciones y el
hash de bcrypt. La función tiene `maxDuration: 30` en `vercel.json`.

## 7. Crear el administrador

Vercel no ofrece una Shell para ejecutar `npm run create-admin`. Define
`ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` como variables de entorno y
redespliega. En la primera petición se creará la cuenta con rol `admin`.

Como la base es efímera, el administrador se vuelve a crear en cada instancia
nueva. Si necesitas el panel de administración durante la demostración,
mantén las tres variables definidas. Usa una contraseña única y no la
compartas fuera del panel de Vercel.

El registro público siempre crea usuarios con rol `user`.

## 8. Verificación de producción

Con la URL pública:

- Comprueba que responde por HTTPS.
- Registra un usuario nuevo e inicia sesión.
- Crea, edita y elimina una tarea.
- Comprueba que otro usuario no puede acceder a esa tarea.
- Entra con el administrador y verifica el listado de tareas y usuarios.
- En las herramientas del navegador, confirma que la cookie de sesión tiene
  `Secure`, `HttpOnly` y `SameSite=Lax`.
- Confirma que `/.env`, `/package.json`, `/data/studytask.db` y
  `/Credenciales%20admin/Credenciales.txt` responden `404`.
- Revisa **Deployments > Functions > Logs** para detectar errores de
  migración o de módulos nativos.
- Fuerza un redespliegue y confirma que los datos desaparecen: es el
  comportamiento esperado de SQLite en `/tmp`.

La prueba local equivalente es:

```bash
npm test
npm run test:production
npm run start:production
```

## 9. Problemas frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `Missing required environment variable` | Falta una variable obligatoria | Añádela en Vercel y redespliega |
| `SQLITE_CANTOPEN` o error de solo lectura | `DATABASE_STORAGE` apunta a una ruta no escribible | Usa `/tmp/studytask.db` o deja que Vercel aplique el valor por defecto |
| Error 500 en la primera petición | Falló una migración o un módulo nativo | Revisa los logs de la función |
| `Cannot find module 'sqlite3'` o `bcrypt` | Dependencia nativa no empaquetada | Verifica que el build instala dependencias y que `includeFiles` conserva la configuración |
| Los formularios devuelven 403 | CSRF o cookies bloqueadas | Usa HTTPS, acepta cookies y no cambies `CSRF_SECRET` entre instancias |
| La función tarda demasiado | Cold start, migraciones o bcrypt | Revisa los logs; `maxDuration` ya es 30 segundos |
| Los datos desaparecen | Comportamiento normal de `/tmp` | Usa una base gestionada o un host con disco persistente |
| `413` o error de tamaño | Función demasiado grande | Revisa `includeFiles` y el tamaño de las dependencias |

## 10. Persistencia real

SQLite necesita un sistema de archivos persistente y una sola instancia de
escritura. En Vercel eso no es posible con el plan Hobby. Las alternativas son:

- **Base gestionada** (por ejemplo Turso para SQLite o Neon para PostgreSQL):
  requiere una cuenta externa y adaptar la conexión de Sequelize. No forma
  parte del alcance actual y debe aprobarse antes de implementarla.
- **Host con disco persistente** (por ejemplo Alwaysdata Free): el repositorio
  conserva `scripts/start-alwaysdata.sh` y la aplicación puede ejecutarse con
  `npm run start:production`. Esa vía mantiene SQLite entre reinicios, pero no
  es la configuración desplegada en Vercel.

No copies el archivo SQLite mientras haya escrituras activas. Para una copia
segura, detén el servicio o usa el mecanismo de backup de SQLite.

## 11. Migración desde Render

`render.yaml` se eliminó porque Render exige un método de pago de verificación
incluso con su plan Free y su almacenamiento gratuito también es efímero. No
se creó ningún servicio en Render, por lo que no hay datos que migrar.

Vercel Hobby no exige método de pago para este proyecto académico y ofrece una
URL HTTPS inmediata. La contrapartida es la limitación de SQLite descrita en la
sección 1.
