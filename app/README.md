# PWA Milpa (jaibaSpace)

PWA para celular, offline-first, conectada a FastAPI:

- Inicio, Menú, Semillas de temporada, Tus parcelas, Predicción a futuro, Información y **Opciones para tu parcela** («¿Qué siembro el próximo ciclo?»).
- Con conexión descarga de FastAPI las zonas, el clima, los planes, las reglas y los catálogos, y los guarda en el teléfono. La comparación de opciones se **calcula en el teléfono** con esos datos y funciona sin conexión.
- Está hecha en JavaScript sin framework, con módulos ES. Vite solo se usa para el servidor de desarrollo y el empaquetado.

- Guía visual: [`docs/look-and-feel.md`](../docs/look-and-feel.md)
- Contrato con la API: [`docs/contrato-frontend-backend.md`](../docs/contrato-frontend-backend.md)
- Decisiones: [`0001`](../docs/decisiones/0001-prototipo-pwa-happy-path.md) (prototipo) y [`0002`](../docs/decisiones/0002-primera-version-funcional.md) (primera versión funcional: reglas del cálculo y supuestos)

## Cómo correrla

Necesitas Node.js 18 o más reciente.

```bash
# 1) Servidor (en otra terminal; ver server/README.md)
cd server
docker compose up --build -d
docker compose exec api alembic upgrade head
docker compose exec api python -m app.seed

# 2) PWA
cd app
npm install
npm run dev        # http://localhost:5173
```

- **URL de la API.** Por defecto es la misma computadora que sirve la página, en el puerto 8000: `http://localhost:8000/api/v1` en la computadora y `http://IP:8000/api/v1` si abres la app por la IP. Para usar otra, abre la app con `?api=https://tu-servidor/api/v1` o define `window.JAIBASPACE_API_BASE` en `index.html`.
- **Sin el servidor.** La app abre igual y usa la copia de los datos que trae empaquetada (respaldo local). Lo dice al pie de «Opciones para tu parcela».
- **Para producción:** `npm run build`. Genera `app/dist/`, que se publica como sitio estático con HTTPS para que funcionen el service worker, el GPS y el micrófono. FastAPI también puede servir esa carpeta (ver `server/README.md`).
- **Pruebas:** `npm test` (34 pruebas con `node:test`: motor, datos publicados y paquete del servidor).

### De dónde salen los datos

1. **Paquete del servidor.** Al abrir, la app pide `GET /api/v1/bundle`, descarga los 11 documentos, comprueba tamaño y SHA-256 y valida que sean coherentes (cada zona con su clima, cada cultivo de los planes con reglas). Si todo está bien, guarda el paquete completo en IndexedDB y lo usa.
2. **Último paquete guardado.** Si no hay red o una descarga falla, se usa el último paquete completo.
3. **Respaldo local.** Si nunca hubo un paquete, se usan los archivos de `app/data` incluidos en la app.

La app usa todos los datos de una sola fuente: no mezcla reglas de una carga con clima de otra.

**Cómo comprobar qué datos consumió:**

- Al pie de «Opciones para tu parcela»: «Datos descargados del servidor… (paquete `xxxxxxxxxxxx`, verificado con SHA-256)» o «copia incluida en la app».
- En la consola del navegador: `__jaibaspace.datos()` (origen, versión del paquete, documentos y huellas) y `__jaibaspace.descarga()` (resultado del último intento).
- En la pestaña Red: `GET /bundle` y una petición por documento a `:8000/api/v1/…`.
- La versión del paquete debe ser la que imprime `python -m app.seed` en el servidor.

### Usarla sin internet (modo avión)

1. Abre la app **una vez con red** y con el servidor encendido. Espera el aviso «Lista para usar sin internet».
2. Desde ahí, las pantallas, los datos del servidor ya descargados, la demo, las imágenes y las letras salen de lo guardado en el teléfono.
3. Para la demo se recomienda la versión empaquetada: `npm run build && npm run preview -- --host`. Con `npm run dev` también funciona, pero recarga la página una vez antes de quitar la red.

Lo que **no** funciona sin internet: las teselas del mapa (queda el GPS y el municipio de respaldo), el reconocimiento de voz de Chrome (aparece el campo para escribir) y el envío de contribuciones (se queda en la cola y sale cuando vuelve la red). La lectura en voz alta («Escuchar») funciona sin red si el teléfono tiene una voz en español instalada.

> No abras `index.html` con doble clic: los módulos ES y el service worker necesitan un servidor (`npm run dev` o `npm run preview`).

### Guía de prueba en modo avión

1. Servidor encendido y cargado (`/api/v1/ready` responde `ready`). PWA con `npm run build && npm run preview -- --host`.
2. Abre `http://localhost:5173`, ve a **Tus parcelas** y toca **Ver con parcelas de ejemplo**.
3. Abre **Opciones para tu parcela** en «Milpa del cenote». Al pie debe decir que los datos vienen del servidor.
4. Espera el aviso «Lista para usar sin internet».
5. Corta la conexión: modo avión en el teléfono o, en la computadora, detén la PWA y la API (`docker compose stop api`). En las herramientas del navegador también sirve «Sin conexión».
6. Recarga. Vuelve a abrir «Opciones para tu parcela»: deben aparecer las tres opciones con los mismos números.
7. Toca **Quiero explorar este plan** en una opción. Debe decir «Plan guardado en este dispositivo».
8. Recarga otra vez, todavía sin conexión: la opción sigue marcada como «Plan guardado» y el detalle de la parcela dice «Elegiste: …».

**En un teléfono Android** (pendiente de repetir por el equipo; pasos exactos):

1. `cd app && npm run build`, y en `server/`: `docker compose restart api`. FastAPI sirve la PWA en el puerto 8000.
2. Conecta el teléfono por USB con la depuración activada y corre `adb reverse tcp:8000 tcp:8000`.
3. En Chrome del teléfono abre `http://localhost:8000/`. Como es `localhost`, se instala el service worker.
4. Repite los pasos 2 a 8 de arriba y, en el paso 5, activa el modo avión.

Por la red Wi-Fi (`http://IP-de-la-computadora:8000/`) la app carga y consume la API, pero el navegador no instala el service worker en `http://` con una IP, así que no sirve para probar el modo avión.

## Guion para la demostración (happy path)

1. **Inicio.**
   - Escribe tu nombre: se guarda solo en el teléfono.
   - Toca la fecha: el calendario colorea el clima (NASA), las previsiones de tu siembra, las siembras y la temporada. Cambia de mes con las flechas.
   - Toca el micrófono y di «parcelas» (Chrome o Edge en Android o escritorio). Si el navegador no entiende voz, aparece un campo para escribir.
2. **Menú.** Cuatro nodos unidos por la raíz.
3. **Tus parcelas.**
   - En el estado vacío, toca **Agregar parcela**:
     - nombre;
     - superficie en m², mecates o hectáreas (o largo × ancho);
     - suelo escrito a tu modo, por ejemplo «k'ankab rojo»;
     - «¿Ya se sembró antes?» → Sí, con cultivo, año, cómo te fue, causa y cosecha;
     - prioridad;
     - mapa: mueve el mapa o usa tu ubicación.
   - Toca **Guardar parcela**: aparece el esquema del terreno.
   - **Agregar semilla:** con el semáforo del mes.
   - Quita una semilla: pide el motivo y lo guarda en **Historial**.
   - Para una demo con más datos: **Ver con parcelas de ejemplo**.
4. **Semillas de temporada.**
   - Semáforo por zona del mes actual; toca «jun» para ver la temporada de siembra.
   - Ficha con fuente y «por confirmar».
   - Buscador abajo y sabucán (pendiente en el servidor).
5. **Predicción a futuro.**
   - Toca una parcela: «x de y señales a favor».
   - Toca cada variable para ver por qué y si el dato es histórico, actual o ambos.
6. **Opciones para tu parcela** (`#/opciones/ej-cenote`): el centro de la demo.
   - Entra desde el detalle de la parcela («¿Qué siembro el próximo ciclo?»), desde Predicción, después de «Terminar siembra» en Información o diciendo «qué siembro» al micrófono.
   - «Meses estimados con cultivo en pie», de 24: 10 con lo que haces hoy, 12 con canavalia entre el maíz y 10 con un ciclo de canavalia. La milpa de ejemplo declara maíz, frijol y calabaza; el cálculo cubre el maíz y lo dice.
   - Cambia la fecha de siembra del escenario (1 y 15 de junio, 1 y 15 de julio): todo se vuelve a calcular. Con el 15 de julio, las rachas secas tocan la floración en 28 de 28 años.
   - Abre «¿Por qué?»: el dato del clima con su periodo y sus años, el calendario del plan, el beneficio, la contrapartida, de dónde sale cada supuesto y las fuentes. La canavalia sale «Sin estimación».
   - Toca «Escuchar» en una tarjeta o «Escuchar las opciones»: la app la lee en voz alta.
   - «Quiero explorar este plan» confirma «Plan guardado en este dispositivo». Al volver a abrir la parcela sigue elegido, y «Ver las fechas en el calendario» las marca como plan, no como siembra.
   - Abajo, como material secundario, la soya. En el Solar de Xbalam (otra zona) aparece el aviso de que las fechas se revisaron para Tekax.
7. **Información.**
   - «Terminar siembra» de la temporada en curso (ya pasó la cosecha estimada del maíz de ejemplo).
   - Compara la predicción contra el resultado real y abre una temporada pasada para ver lo que midió NASA ese año.
   - Acepta compartir: las contribuciones se encolan y se envían cuando hay servidor.

## Estructura

```text
app/
├── index.html
├── public/                 manifest.webmanifest, sw.js, icons/   (Vite los sirve en la raíz)
├── data/                   zonas, clima (pipeline NASA), reglas, planes y catalogos/: respaldo local de lo que publica el servidor
├── fixtures/               ejemplo-milpa.json (perfil y parcelas de demostración; el servidor los carga y los publica en /demo)
├── src/
│   ├── main.js             arranque y rutas
│   ├── app/                router por hash, estado de sesión y precarga para usarla sin internet
│   ├── services/api/       cliente HTTP y endpoints reales de /api/v1
│   ├── services/contenido.js   descarga, valida y guarda el paquete de datos del servidor
│   ├── services/sync/      cola de envíos (pendiente → enviada | error)
│   ├── storage/            IndexedDB con respaldo en localStorage
│   ├── modules/
│   │   ├── parcel/         CRUD, zona más cercana, esquema del terreno, ejemplo
│   │   ├── crops/          catálogos, suelo escrito → catálogo, semáforo por mes y zona
│   │   ├── harvests/       temporadas, cosechas, consentimiento, contribuciones
│   │   ├── climate/        exposición histórica a rachas y calor, escenarios
│   │   ├── strategies/     reglas y planes publicados
│   │   └── statistics/     (consulta en services/api/endpoints.js)
│   ├── motor/              estrategias.js y comparacion.js (comparación de opciones), prediccion.js (señales) y calendario.js
│   ├── ui/
│   │   ├── pantallas/      inicio, menu, semillas, parcelas
│   │   ├── captura/        formulario de parcela, mapa, siembra, motivo de eliminación
│   │   ├── resultados/     predicción, información, opciones (+ opciones-datos, que junta parcela y datos para el motor)
│   │   ├── componentes/    terreno, franja24 (24 meses con o sin cultivo en pie)
│   │   └── styles/         tokens, base, componentes, pantallas
│   ├── i18n/               es y maya (acentos por validar)
│   ├── shared/             dom, formatos, íconos, imágenes, datos
│   ├── assets/             imágenes y fuentes (OFL)
│   └── vendor/leaflet/     Leaflet 1.9.4 (BSD-2)
└── tests/                  pruebas del motor y de los datos publicados (fixtures/: caso de control de Umán)
```

## Rutas

| Ruta | Pantalla |
|---|---|
| `#/inicio` | Inicio |
| `#/menu` | Menú |
| `#/semillas` | Semillas de temporada |
| `#/parcelas` | Tus parcelas (`?tab=historial`) |
| `#/parcelas/nueva` | Agregar parcela |
| `#/parcelas/:id` | Detalle (`?sembrar=semillaId` abre la hoja de siembra) |
| `#/parcelas/:id/editar` | Editar |
| `#/prediccion` | Predicción a futuro |
| `#/prediccion/:id` | Señales de una parcela |
| `#/informacion` | Información (`?registrar=1` abre «Terminar siembra») |
| `#/opciones` | Opciones: elegir parcela (si hay una sola, entra directo) |
| `#/opciones/:id` | Opciones para tu parcela: ¿qué siembro el próximo ciclo? |
| `#/inicio?cal=AAAA-MM` | Inicio con el calendario abierto en ese mes |

## El motor de comparación

La pantalla de Opciones ya no usa una salida de ejemplo. El recorrido de los datos es:

1. `src/ui/resultados/opciones-datos.js` junta lo que el productor registró en la parcela con los datos publicados.
2. `src/motor/comparacion.js` decide qué planes se comparan (la práctica registrada o la plantilla, la intercalada y el ciclo de cobertura), con qué fechas y qué no se puede estimar.
3. `src/motor/estrategias.js` calcula los meses con cultivo en pie y la exposición histórica.

Las reglas del cálculo, los denominadores y los supuestos están en [`docs/decisiones/0002-primera-version-funcional.md`](../docs/decisiones/0002-primera-version-funcional.md). Los dos módulos del motor son funciones puras y se prueban con `npm test`.
