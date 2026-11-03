# StudyTask --- Software Requirements Specification (SRS)

**Versión:** 1.1\
**Estado:** Implementado con SQLite; despliegue público pendiente\
**Tipo:** Proyecto académico --- Trabajo Final de Node.js\
**Idioma de la interfaz:** Español

## 1. Introducción

### 1.1 Propósito

Este documento define los requisitos funcionales y no funcionales de
StudyTask. Será la referencia para diseñar, implementar, probar y
desplegar la aplicación.

### 1.2 Descripción del problema

Los estudiantes suelen organizar actividades académicas mediante notas,
mensajes y recordatorios dispersos. Esto dificulta mantener una visión
clara de las tareas pendientes y sus fechas de entrega.

StudyTask centraliza el registro y seguimiento de tareas académicas en
una aplicación web sencilla.

### 1.3 Objetivo general

Desarrollar una aplicación web que permita a estudiantes registrar,
consultar, organizar, actualizar y eliminar sus actividades académicas.

## 2. Alcance

### 2.1 Incluido en la primera versión

-   Registro e inicio/cierre de sesión.
-   Autenticación mediante JWT en cookie HttpOnly.
-   Roles `user` y `admin`.
-   CRUD de tareas académicas.
-   Cambio de estado entre pendiente y completada.
-   Filtro por estado.
-   Panel administrativo sencillo.
-   Vistas dinámicas con EJS.
-   Persistencia en SQLite sin servidor externo.
-   Despliegue público con HTTPS.

### 2.2 Fuera del alcance

-   Aplicación móvil.
-   Chat.
-   Gestión de profesores, matrículas o instituciones.
-   Gestión independiente de asignaturas.
-   Calendario interactivo.
-   Notificaciones por correo.
-   Subida de archivos.
-   Inteligencia artificial.
-   Sincronización con calendarios externos.
-   Analítica avanzada.

## 3. Tipos de usuario y permisos

### 3.1 Estudiante (`user`)

Puede: - Registrarse e iniciar sesión. - Crear tareas. - Listar sus
propias tareas. - Consultar detalles de sus tareas. - Editar sus propias
tareas. - Eliminar sus propias tareas. - Cambiar el estado de sus
tareas. - Filtrar sus tareas por estado.

No puede consultar ni modificar tareas de otros estudiantes.

### 3.2 Administrador (`admin`)

Puede: - Iniciar y cerrar sesión. - Consultar todas las tareas. -
Consultar los detalles de cualquier tarea. - Identificar al propietario
de cada tarea. - Eliminar cualquier tarea. - Consultar el listado de
usuarios registrados.

El administrador no necesita editar las tareas de otros usuarios.

### 3.3 Alta de administradores

El registro público asignará siempre el rol `user`. La creación de
administradores se realizará mediante un procedimiento controlado, no
mediante el formulario público.

## 4. Requisitos funcionales

  -----------------------------------------------------------------------
  ID                      Requisito               Descripción
  ----------------------- ----------------------- -----------------------
  RF-01                   Registro                Permitir crear una
                                                  cuenta con nombre,
                                                  correo y contraseña.

  RF-02                   Inicio de sesión        Validar credenciales y
                                                  crear una sesión basada
                                                  en JWT.

  RF-03                   Cierre de sesión        Invalidar la cookie de
                                                  autenticación en el
                                                  navegador.

  RF-04                   Crear tarea             Permitir a un
                                                  estudiante crear una
                                                  tarea propia.

  RF-05                   Listar tareas           Mostrar únicamente las
                                                  tareas del estudiante
                                                  autenticado.

  RF-06                   Ver detalle             Mostrar los datos
                                                  completos de una tarea
                                                  propia.

  RF-07                   Editar tarea            Permitir modificar los
                                                  campos de una tarea
                                                  propia.

  RF-08                   Eliminar tarea          Permitir eliminar una
                                                  tarea propia, previa
                                                  confirmación en la
                                                  interfaz.

  RF-09                   Cambiar estado          Permitir cambiar entre
                                                  `pending` y
                                                  `completed`.

  RF-10                   Filtrar tareas          Filtrar por todas,
                                                  pendientes o
                                                  completadas.

  RF-11                   Administración de       Permitir al
                          tareas                  administrador listar,
                                                  consultar y eliminar
                                                  cualquier tarea.

  RF-12                   Administración de       Permitir al
                          usuarios                administrador consultar
                                                  usuarios sin exponer
                                                  hashes.

  RF-13                   Protección de rutas     Exigir autenticación,
                                                  rol y propiedad del
                                                  recurso según
                                                  corresponda.
  -----------------------------------------------------------------------

### 4.1 Reglas de RF-01: registro

-   Campos obligatorios: nombre, correo y contraseña.
-   El correo será único.
-   Los datos serán validados en el servidor.
-   La contraseña se almacenará como hash bcrypt.
-   El rol inicial será `user`.
-   Nunca se aceptará el rol enviado por el cliente como fuente de
    autorización.

### 4.2 Reglas de RF-02: inicio de sesión

-   Buscar el usuario por correo.
-   Verificar la contraseña con bcrypt.
-   Firmar un JWT con un secreto de entorno.
-   Incluir en el token únicamente los datos necesarios para identificar
    al usuario y su rol.
-   Guardar el token en una cookie HttpOnly.
-   Configurar expiración del token y duración coherente de la cookie.

### 4.3 Reglas de RF-04: creación de tareas

Campos: - `title`: obligatorio. - `description`: opcional. - `subject`:
opcional. - `due_date`: opcional. - `status`: asignado por el servidor
con valor inicial `pending`. - `user_id`: asignado por el servidor desde
el usuario autenticado.

El cliente no podrá elegir el propietario de la tarea.

### 4.4 Reglas de RF-09: estados

Los únicos estados permitidos serán: - `pending` - `completed`

## 5. Requisitos no funcionales

  -----------------------------------------------------------------------
  ID                                  Requisito
  ----------------------------------- -----------------------------------
  RNF-01                              Las contraseñas deben almacenarse
                                      mediante bcrypt.

  RNF-02                              Las rutas privadas deben verificar
                                      JWT y expiración.

  RNF-03                              La cookie JWT debe ser HttpOnly y
                                      usar Secure en producción.

  RNF-04                              Las operaciones mutables
                                      autenticadas mediante cookie deben
                                      tener protección CSRF.

  RNF-05                              La aplicación debe seguir
                                      arquitectura MVC.

  RNF-06                              Las vistas deben implementarse con
                                      EJS.

  RNF-07                              La interfaz debe ser sencilla,
                                      comprensible y adaptable a móvil y
                                      escritorio.

  RNF-08                              SQLite debe conservar los datos
                                      entre reinicios.

  RNF-09                              Los secretos y credenciales deben
                                      estar en variables de entorno.

  RNF-10                              Los errores no deben revelar
                                      secretos ni detalles internos.

  RNF-11                              El código debe estar modularizado y
                                      mantener responsabilidades
                                      separadas.

  RNF-12                              La aplicación debe desplegarse con
                                      HTTPS y configuración de
                                      producción.
  -----------------------------------------------------------------------

## 6. Modelo de información resumido

### User

  Campo        Tipo lógico   Restricción
  ------------ ------------- ----------------------------------
  id           INTEGER       PK, autoincremental
  name         STRING        NOT NULL
  email        STRING        NOT NULL, UNIQUE
  password     STRING        NOT NULL, hash bcrypt
  role         ENUM          `user` o `admin`, default `user`
  created_at   DATE          NOT NULL

### Task

  Campo         Tipo lógico   Restricción
  ------------- ------------- -------------------------
  id            INTEGER       PK, autoincremental
  title         STRING        NOT NULL
  description   TEXT          NULL
  subject       STRING        NULL
  due_date      DATE          NULL
  status        ENUM          `pending` o `completed`
  user_id       INTEGER       FK a User.id, NOT NULL
  created_at    DATE          NOT NULL
  updated_at    DATE          NOT NULL

La especificación detallada de columnas y relaciones se encuentra en
`DATABASE.md`.

## 7. Reglas de negocio

-   RN-01: todo registro público crea un usuario con rol `user`.
-   RN-02: solo `admin` puede consultar el conjunto global de tareas.
-   RN-03: un usuario solo puede gestionar sus propias tareas.
-   RN-04: toda tarea debe tener un propietario.
-   RN-05: el título es obligatorio.
-   RN-06: una tarea nueva comienza como `pending`.
-   RN-07: los estados permitidos son `pending` y `completed`.
-   RN-08: el propietario se obtiene de la identidad autenticada, nunca
    de un dato confiado del formulario.
-   RN-09: los hashes de contraseña no se muestran ni se devuelven a las
    vistas.
-   RN-10: las operaciones que cambian datos no utilizarán el método
    GET.

## 8. Criterios de aceptación

El proyecto se considerará funcionalmente completo cuando:

-   Un usuario pueda registrarse e iniciar sesión.
-   Las contraseñas se almacenen como hashes bcrypt.
-   El JWT se verifique en las rutas privadas.
-   El cierre de sesión elimine la cookie del navegador.
-   Un estudiante pueda completar el CRUD de sus tareas.
-   Un estudiante no pueda acceder a tareas ajenas, incluso manipulando
    la URL.
-   El administrador pueda consultar y eliminar tareas de cualquier
    usuario.
-   El administrador pueda consultar usuarios sin ver hashes.
-   El filtro por estado funcione.
-   EJS renderice las vistas dinámicas.
-   SQLite persista los datos.
-   La aplicación desplegada funcione mediante HTTPS.

## 9. Relación con el enunciado académico

StudyTask debe cumplir todos los requisitos obligatorios del PDF del
proyecto final:

1.  Arquitectura MVC con carpetas separadas.
2.  CRUD completo sobre un recurso principal y base de datos real.
3.  Registro, login, bcrypt, JWT, middleware de protección y roles
    `user`/`admin`.
4.  Vistas dinámicas EJS, layout y partials.
5.  Despliegue en Render o plataforma permitida, variables de entorno y
    HTTPS.

Los extras académicos no se consideran parte del alcance inicial salvo
que se aprueben posteriormente.
