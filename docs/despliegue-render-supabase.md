# Despliegue en Render con la base en Supabase

Resultado: **una sola URL** de Render (`https://jaibaspace-xxxx.onrender.com`) que sirve la PWA en `/` y la API en `/api/v1`. La base de datos (PostgreSQL con PostGIS) está en Supabase. Como todo está en el mismo origen y con HTTPS, no hace falta configurar CORS y el service worker se instala: la app funciona sin conexión después de abrirla una vez.

## Archivos

| Archivo | Para qué |
|---|---|
| `Dockerfile` (raíz) | Compila la PWA y arma la imagen de FastAPI con los datos publicados adentro |
| `server/scripts/start.sh` | Al arrancar: `alembic upgrade head`, `python -m app.seed` (idempotente) y `uvicorn` en el puerto que da Render |
| `render.yaml` | Blueprint de Render: servicio web Docker, plan gratuito, health check en `/api/v1/health` |
| `.dockerignore` | Deja fuera `node_modules`, `.venv`, `.env` y lo que no va en la imagen |

`server/docker-compose.yml` se sigue usando para desarrollo local.

## Paso 1. Supabase: la cadena de conexión

1. En el proyecto de Supabase, toca **Connect** (arriba).
2. Elige **Session pooler** (puerto **5432**). No uses «Direct connection»: es solo IPv6 y Render no la alcanza.
3. Copia la cadena. Se ve así:
   `postgresql://postgres.<ref-del-proyecto>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres`
4. Cambia `[YOUR-PASSWORD]` por la contraseña de la base (la que pusiste al crear el proyecto; se puede cambiar en *Project Settings → Database*). Si la contraseña tiene `@ : / ? # %`, conviene cambiarla por una sin esos caracteres.

No hace falta convertirla: la API acepta `postgresql://` y agrega `sslmode=require` sola. PostGIS lo activa la primera migración (`CREATE EXTENSION IF NOT EXISTS postgis`).

**No pegues esta cadena en chats ni en el repositorio.** Solo va en Render.

## Paso 2. Render: crear el servicio

**Opción A, Blueprint (automática).** Render lee `render.yaml`.

1. **New → Blueprint** y elige el repositorio y la rama.
2. Render pide `DATABASE_URL`: pega la cadena del paso 1.
3. **Apply**. Render compila la imagen (5–10 min la primera vez), migra, carga los datos y publica la URL.

Para el Blueprint, Render necesita acceso por GitHub al repositorio. Si el repositorio es de otra cuenta y no te deja conectarlo, usa la opción B o un fork propio.

**Opción B, servicio web manual (repositorio público).**

1. **New → Web Service → Public Git Repository** y pega `https://github.com/frediab1999-svg/jaibaSpace-Field-Shift-Adapting-Farms-with-NASA-Data-`.
2. Rama: la que tenga el `Dockerfile` en la raíz. Runtime: **Docker**. Plan: **Free**.
3. En *Advanced*: **Health Check Path** `/api/v1/health`.
4. En *Environment*: `DATABASE_URL` = la cadena del paso 1, y `APP_ENV` = `production`.
5. **Create Web Service**.

Con un repositorio público sin conectar, Render no despliega solo en cada `push`: hay que tocar **Manual Deploy** o usar el *Deploy Hook*.

## Paso 3. Comprobar

```bash
curl https://TU-SERVICIO.onrender.com/api/v1/health   # {"status":"ok"}
curl https://TU-SERVICIO.onrender.com/api/v1/ready    # {"status":"ready","database":"ok","published_documents":11}
```

Luego abre `https://TU-SERVICIO.onrender.com/` en el celular y sigue la guía de modo avión de `app/README.md`.

## Problemas comunes

| Síntoma en los logs de Render | Causa | Solución |
|---|---|---|
| `Network is unreachable` o `could not translate host name` | Se usó la conexión directa de Supabase (IPv6) | Usa el **Session pooler** (puerto 5432) |
| `password authentication failed` | Contraseña equivocada o con caracteres especiales sin codificar | Revisa la contraseña o cámbiala en Supabase |
| `prepared statement ... already exists` | Se usó el pooler en modo transacción (puerto 6543) | Usa el puerto 5432. La API ya desactiva las sentencias preparadas en 6543, pero el modo sesión es el recomendado |
| `ERROR: falta la variable DATABASE_URL` | No se configuró la variable | Agrégala en *Environment* y vuelve a desplegar |
| La primera visita tarda ~50 s | El plan gratuito de Render apaga el servicio tras 15 min sin uso | Es normal; el plan de pago lo evita |
| `/ready` responde `content_not_loaded` | Falló la carga de datos | Revisa los logs de `python -m app.seed` |

## Actualizar los datos

Cada despliegue vuelve a correr la migración y la carga, así que basta con desplegar después de cambiar `app/data`. Para que un despliegue no recargue los datos, pon `RUN_SEED_ON_START=0`.
