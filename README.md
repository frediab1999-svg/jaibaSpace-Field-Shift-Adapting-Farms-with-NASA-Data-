# jaibaSpace — Field Shift: Adapting Farms with NASA Data

jaibaSpace es una PWA para productores de temporal de la Península de Yucatán. El producto evoluciona del MVP inicial de maíz a una herramienta multicultivo que combina clima histórico, escenarios climáticos, información de semillas disponible y registros voluntarios de parcelas y cosechas.

La PWA está diseñada para trabajar sin conexión con datos previamente descargados. Cuando hay conexión, puede sincronizar registros autorizados con una API FastAPI y consultar estadísticas colectivas almacenadas en PostgreSQL/PostGIS.

El sistema presenta evidencia e incertidumbre; no predice rendimientos ni garantiza cosechas. Las estadísticas colectivas se muestran por zona y periodo, no como datos de parcelas individuales.

## Documentación vigente

| Documento | Contenido |
|---|---|
| [Contexto general del proyecto](docs/contexto-general-proyecto.md) | Producto, alcance geográfico, usuarios y principios. |
| [Arquitectura y estructura](docs/arquitectura-y-estructura.md) | Componentes, carpetas, entidades iniciales y orden sugerido. |
| [Requisitos del sistema](docs/requisitos-del-sistema.md) | Requisitos funcionales, de calidad y decisiones pendientes. |
| [Reto oficial](docs/reto-oficial.md) | Texto del reto NASA Space Apps Challenge. |
| [Diagramas](docs/diagramas/) | Casos de uso y modelo de dominio de la arquitectura multicultivo. |
| [Look & feel](docs/look-and-feel.md) | Guía visual, tono, componentes y accesibilidad de la PWA. |
| [Contrato frontend ↔ backend](docs/contrato-frontend-backend.md) | Endpoints que usa la PWA, entidades y brechas en ambos sentidos. |
| [Datos publicados del MVP](docs/entrega-datos-mvp.md) | Zonas, puntos, archivos de clima, qué se puede calcular y cómo auditarlos. |
| [Reglas agrícolas y fuentes](docs/rol-3-fuentes-y-rotaciones.md) | Planes, reglas, suelos y fuentes para Tekax. |
| [Declaración de uso de IA](docs/declaracion-uso-ia.md) | Qué partes de la entrega se hicieron con IA. |
| [Decisiones](docs/decisiones/) | Decisiones de arquitectura versionadas. |

## Evolución de la documentación

Se retiraron los documentos de implementación v0.2 centrados en maíz para evitar confundirlos con la nueva arquitectura multicultivo. Los contratos que ya están implementados se describen en el contrato frontend ↔ backend y en la decisión 0002; los esquemas de `shared/schemas/` siguen siendo propuestas del prototipo.

## Estructura principal

```text
app/             PWA JavaScript, interfaz, almacenamiento local y sincronización
server/          API FastAPI, módulos de dominio y migraciones PostgreSQL/PostGIS
data-pipeline/   Ingesta y preparación de clima, escenarios y catálogos
shared/          Esquemas y datos de ejemplo compartidos
docs/            Contexto, requisitos, arquitectura y diagramas
```

La estructura detallada está en [arquitectura-y-estructura.md](docs/arquitectura-y-estructura.md). El árbol se irá materializando por fases; las fuentes de proyecciones y semillas y otras decisiones pendientes se documentan en [requisitos-del-sistema.md](docs/requisitos-del-sistema.md).

## Ejecutar la beta en local

La beta está en `develop`. Tu computadora ejecutará la interfaz, FastAPI y PostgreSQL/PostGIS; no necesitas infraestructura en la nube ni cuentas. La primera instalación requiere internet. Los datos climáticos ya están incluidos: no necesitas claves de NASA ni regenerarlos.

### 1. Requisitos

- Git, para clonar o actualizar el repositorio.
- Node.js 22 LTS y npm, para generar la interfaz.
- Docker Desktop con Docker Compose, abierto y con el motor funcionando. En Windows, usa contenedores Linux y completa la configuración de WSL 2 que solicite Docker Desktop.

Comprueba en la terminal de VS Code:

```text
git --version
node --version
npm --version
docker --version
docker compose version
```

Con este recorrido no necesitas instalar Python ni PostgreSQL por separado. Ejecuta los comandos uno por uno y espera a que termine cada paso.

### 2. Obtener develop

Si todavía no tienes el repositorio:

```text
git clone --branch develop https://github.com/frediab1999-svg/jaibaSpace-Field-Shift-Adapting-Farms-with-NASA-Data-.git
cd jaibaSpace-Field-Shift-Adapting-Farms-with-NASA-Data-
```

Si ya lo tienes clonado, abre una terminal en la raíz del repositorio. Revisa `git status` y guarda tus cambios propios antes de cambiar de rama:

```text
git status
git switch develop
git pull --ff-only origin develop
```

Si Git indica que las ramas han divergido, revisa los commits antes de continuar; no fuerces un reset.

También puedes abrir [develop en GitHub](https://github.com/frediab1999-svg/jaibaSpace-Field-Shift-Adapting-Farms-with-NASA-Data-/tree/develop), elegir **Code → Download ZIP**, descomprimir y abrir esa carpeta en VS Code. El ZIP no incluye Git: omite los comandos de Git. Continúa desde la raíz, donde están `app/`, `server/` y este README.

### 3. Preparar la interfaz

Desde la raíz:

```text
cd app
npm ci
npm run build
cd ../server
```

Esto genera `app/dist`. FastAPI servirá esa carpeta en el mismo puerto que la API, sin mantener Vite abierto.

### 4. Crear la configuración local

Desde `server/`, copia la plantilla **solo la primera vez**. Si ya tienes `.env`, conserva tu configuración.

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

En macOS o Linux:

```bash
cp .env.example .env
```

Abre `server/.env` en VS Code. Sustituye `cambiar_solo_para_desarrollo` por una contraseña local tanto en `POSTGRES_PASSWORD` como en `DATABASE_URL`. Para este arranque usa letras y números, evitando caracteres que necesiten codificación dentro de la URL. Conserva los demás valores. No subas `.env` a Git.

### 5. Levantar la beta y cargar los datos

Desde `server/`, con Docker Desktop funcionando:

```text
docker compose up --build -d
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed
docker compose ps
```

La primera construcción puede tardar varios minutos. `up` levanta PostgreSQL/PostGIS y FastAPI; `alembic` crea las tablas; `app.seed` carga zonas, clima, planes, reglas, catálogos y parcelas ficticias. La carga puede repetirse con los mismos archivos.

### 6. Comprobar y abrir el producto

Abre estas direcciones en el navegador:

| Dirección | Resultado esperado |
|---|---|
| <http://localhost:8000/api/v1/health> | `"status": "ok"`: la API responde |
| <http://localhost:8000/api/v1/ready> | `"status": "ready"`, base disponible y 11 documentos publicados con los datos actuales |
| <http://localhost:8000/docs> | Documentación interactiva de la API |
| <http://localhost:8000/> | Interfaz de la beta |

No abras `app/index.html` con doble clic. Mantén Docker Desktop funcionando mientras uses la API.

### 7. Recorrido de demostración

1. Entra en **Tus parcelas**.
2. Toca **Ver con parcelas de ejemplo**. No necesitas registrarte.
3. Abre **Milpa del cenote**.
4. Entra en **¿Qué siembro el próximo ciclo?**.
5. Compara las tres opciones, cambia la fecha de siembra y abre **¿Por qué?** para consultar evidencia y supuestos.
6. Toca **Quiero explorar este plan**, recarga y comprueba que la elección permanece en el mismo navegador.

Al pie de las opciones debe indicarse que los datos se descargaron del servidor. La comparación se calcula en el dispositivo. Los catálogos aún incluyen datos de prototipo y las proyecciones climáticas futuras están pendientes; la beta no predice rendimientos ni garantiza cosechas.

### 8. Probar sin conexión

1. Abre <http://localhost:8000/> con los servicios activos y espera **Lista para usar sin internet**.
2. Carga las parcelas de ejemplo y abre las opciones para guardar también el paquete de datos.
3. Desde `server/`, ejecuta `docker compose stop`.
4. Recarga la misma dirección en el mismo navegador: las pantallas y la comparación deben abrir desde lo guardado.
5. Vuelve a encender los servicios con `docker compose up -d`.

Esto comprueba el uso sin servidor. Para simular una desconexión total, desactiva también la red o usa **Offline** en las herramientas del navegador. Las teselas del mapa, ciertos servicios de voz y las consultas o envíos al servidor necesitan conexión. No borres los datos del sitio: las parcelas personales y los planes se guardan en el navegador.

Para Android, consulta [la guía de la PWA](app/README.md). Abrir `http://IP-de-tu-computadora:8000/` desde otro dispositivo permite ver la interfaz, pero no instala el service worker porque esa dirección no es un contexto seguro.

### Apagar y volver a arrancar

Desde `server/`, para apagar conservando la base:

```text
docker compose down
```

Para volver a usar la misma versión:

```text
docker compose up -d
```

No necesitas repetir migraciones y carga en cada arranque. Evita `docker compose down -v`: elimina el volumen de la base de datos.

### Actualizar la beta

Desde la raíz de una copia clonada, con tus cambios propios guardados:

```text
git switch develop
git pull --ff-only origin develop
cd app
npm ci
npm run build
cd ../server
docker compose up --build -d
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed
docker compose restart api
```

Si usas ZIP, descarga y prepara la nueva versión por separado siguiendo esta guía; Git no actualiza una descarga ZIP.

### Problemas frecuentes

| Síntoma | Qué revisar |
|---|---|
| Docker no conecta o menciona el daemon | Abre Docker Desktop y espera a que el motor esté listo; en Windows usa contenedores Linux. |
| Falta `.env` | Completa el paso 4 dentro de `server/`. |
| Puerto 8000 o 5432 ocupado | Detén el otro servicio que usa ese puerto antes de arrancar Compose. |
| `/health` responde pero `/ready` falla | Ejecuta las migraciones y la carga. Revisa `docker compose logs --tail=100 api db` si persiste. |
| La API abre pero la interfaz devuelve 404 | Genera `app/dist` con `npm run build` desde `app/` y ejecuta `docker compose restart api` desde `server/`. |
| La app usa la copia incluida | Revisa `/ready`, recarga con la API encendida y comprueba que no configuraste otra API mediante `?api=`. |
| Error de contraseña después de editar `.env` | Una base existente conserva su contraseña original. Recupera esa configuración o revisa la base antes de modificarla. |

Para editar la interfaz puedes ejecutar `npm run dev` desde `app/` y abrir <http://localhost:5173>, manteniendo la API en Docker. Para probar la beta y el modo sin conexión, usa el build servido en el puerto 8000.

Detalles adicionales: [PWA](app/README.md) y [servidor](server/README.md).

## Arranque alternativo con Vite (desarrollo)

```bash
# Servidor: PostgreSQL/PostGIS + FastAPI (ver server/README.md)
cd server
cp .env.example .env            # cambia POSTGRES_PASSWORD
docker compose up --build -d
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed

# PWA (ver app/README.md)
cd ../app
npm install
npm run dev                     # http://localhost:5173
```

Recorrido: **Tus parcelas → Ver con parcelas de ejemplo → Milpa del cenote → ¿Qué siembro el próximo ciclo?**. La PWA descarga de FastAPI las zonas, el clima, los planes, las reglas y los catálogos, los guarda en el teléfono y calcula ahí la comparación de tres opciones. Después de la primera carga funciona sin conexión. Sin el servidor, la app abre con la copia local de los datos.

Pruebas: `npm test` en `app/` y `python -m pytest` en `server/`. Auditoría de datos: `python data-pipeline/auditar_datos.py app/data`.

El piloto agrícola es **Tekax, Sur de Yucatán** (`yuc-sur`). El clima regional también está publicado para Los Chenes (Campeche) y la Zona maya (Quintana Roo).

## Pipeline climático

`data-pipeline/clima.py` descarga y prepara el clima histórico de NASA POWER por zona, y `data-pipeline/auditar_datos.py` comprueba los archivos publicados. Consulta [data-pipeline/README.md](data-pipeline/README.md) y [docs/entrega-datos-mvp.md](docs/entrega-datos-mvp.md).
