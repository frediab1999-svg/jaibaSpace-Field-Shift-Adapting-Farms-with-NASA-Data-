# PWA Milpa (jaibaSpace)

PWA para celular, offline-first, conectada a FastAPI:

- Inicio, Menú, Semillas de temporada, Tus parcelas, Predicción a futuro, Información y **Opciones para tu parcela** («¿Qué siembro el próximo ciclo?»).
- Con conexión descarga de FastAPI las zonas, el clima, los planes, las reglas y los catálogos, y los guarda en el teléfono. La comparación de opciones se **calcula en el teléfono** con esos datos y funciona sin conexión.
- Está hecha en JavaScript sin framework, con módulos ES. Vite solo se usa para el servidor de desarrollo y el empaquetado.

- Guía visual: [`docs/look-and-feel.md`](../docs/look-and-feel.md)
- Contrato con la API: [`docs/contrato-frontend-backend.md`](../docs/contrato-frontend-backend.md)
- Decisiones: [`0001`](../docs/decisiones/0001-prototipo-pwa-happy-path.md) (prototipo), [`0002`](../docs/decisiones/0002-primera-version-funcional.md) (primera versión funcional: reglas del cálculo y supuestos) [`0003`](../docs/decisiones/0003-coherencia-datos-y-ux.md) (no recomendar sin zona, clima resumido, varias semillas) y [`0004`](../docs/decisiones/0004-mvp-tierra-y-tiempo.md) (MVP del Hackathon: diagnóstico de la tierra, plan de 2 años y clima por punto)

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
- **Pruebas:** `npm test` (56 pruebas con `node:test`: motor, clima por día, diagnóstico de la tierra, clima por punto, datos publicados y paquete del servidor).

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
3. Abre **Tu plan de 2 años** en «Milpa del cenote». Al pie debe decir que los datos vienen del servidor.
4. Espera el aviso «Lista para usar sin internet».
5. Corta la conexión: modo avión en el teléfono o, en la computadora, detén la PWA y la API (`docker compose stop api`). En las herramientas del navegador también sirve «Sin conexión».
6. Recarga. Vuelve a abrir «Tu plan de 2 años»: deben aparecer las tres opciones con los mismos números.
7. Toca **Quiero este plan** en una opción. Debe decir «Plan guardado en este teléfono».
8. Recarga otra vez, todavía sin conexión: la opción sigue marcada como «Plan guardado» y el detalle de la parcela dice «Elegiste: …».

**En un teléfono Android** (pendiente de repetir por el equipo; pasos exactos):

1. `cd app && npm run build`, y en `server/`: `docker compose restart api`. FastAPI sirve la PWA en el puerto 8000.
2. Conecta el teléfono por USB con la depuración activada y corre `adb reverse tcp:8000 tcp:8000`.
3. En Chrome del teléfono abre `http://localhost:8000/`. Como es `localhost`, se instala el service worker.
4. Repite los pasos 2 a 8 de arriba y, en el paso 5, activa el modo avión.

Por la red Wi-Fi (`http://IP-de-la-computadora:8000/`) la app carga y consume la API, pero el navegador no instala el service worker en `http://` con una IP, así que no sirve para probar el modo avión.

## Guion para la demostración (Hackathon)

La app responde a una pregunta: **¿cómo siembro mi parcela los próximos dos años sin acabarme la tierra?** Hay dos casos de uso (decisión [`0004`](../docs/decisiones/0004-mvp-tierra-y-tiempo.md)):

1. **Inicio.** Escribe tu nombre. Aparece «Cuidemos tu tierra»: **Empezar** (cuestionario) o **Mira un ejemplo** (Pablo o Juan).
2. **Pablo, tierra cansada.**
   - **Diagnóstico.** «Tu tierra está cansada», con sus razones: 4+ años, sin descanso, con quema, mala cosecha.
   - **El tiempo de tu tierra.** 14 de 24 meses sin cultivo. Con maíz y canavalia, 2 meses más cubierta.
   - Clima de la temporada en palabras y referencia de Tekax (2.22 y 2.35 t/ha, promedio del municipio).
   - **Ver tu plan de 2 años.** Tres estrategias: la sugerida arriba y la de hoy para comparar. Cada una con cinco líneas: por qué, datos, qué gana, qué falta saber y qué revisar con el técnico.
   - Como Pablo necesita cosechar, se sugiere la intercalada y una nota dice que la cobertura recupera más rápido. Cambia «¿Qué buscas?» a «Cuidar mi tierra» (Cambiar mis respuestas) y la sugerida pasa a ser el ciclo de canavalia.
   - **¿Cuándo me conviene sembrar?** Barras por fecha: en cuántos años la sequía tocó la floración. Su fecha (15 de junio) contra la mejor del punto.
3. **Juan, tierra nueva.** «Tierra nueva»: lo que se hace normalmente (roza, tumba y quema) queda como referencia. Se sugiere milpa con canavalia desde el primer ciclo, más los consejos de no quemar y dejar franjas de monte.
4. **Tu propia parcela.** Menú → «Registra tu parcela»: 4 pasos (dónde, cómo está tu tierra, suelo y tamaño, qué buscas). Al guardar se pide el clima de ese punto a la NASA (vía FastAPI) y se abre el diagnóstico. Mueve el pin a otro lugar: los números cambian.
5. **Guardar el plan.** «Quiero este plan» lo guarda en el teléfono y «Ver las fechas en el calendario» lo marca en Inicio.
6. **Cerrar el ciclo.** En Información, «Terminar siembra»: el resultado y el año se suman al diagnóstico.

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
| `#/parcelas/nueva` | Cuestionario de la parcela (4 pasos) |
| `#/parcelas/:id` | Detalle (`?sembrar=semillaId` abre la hoja de siembra) |
| `#/parcelas/:id/editar` | Editar |
| `#/prediccion` | Predicción a futuro |
| `#/prediccion/:id` | ¿Cuándo me conviene sembrar? Mejor fecha y señales |
| `#/informacion` | Información (`?registrar=1` abre «Terminar siembra») |
| `#/opciones` | Opciones: elegir parcela (si hay una sola, entra directo) |
| `#/opciones/:id` | Tu plan de 2 años: tres estrategias, la sugerida según el diagnóstico |
| `#/diagnostico/:id` | Diagnóstico de tu tierra (se abre al terminar el cuestionario) |
| `#/inicio?cal=AAAA-MM` | Inicio con el calendario abierto en ese mes |

## El motor de comparación

La pantalla de Opciones ya no usa una salida de ejemplo. El recorrido de los datos es:

1. `src/ui/resultados/opciones-datos.js` junta lo que el productor registró en la parcela con los datos publicados.
2. `src/motor/comparacion.js` decide qué planes se comparan (la práctica registrada o la plantilla, la intercalada y el ciclo de cobertura), con qué fechas y qué no se puede estimar.
3. `src/motor/estrategias.js` calcula los meses con cultivo en pie y la exposición histórica.

Las reglas del cálculo, los denominadores y los supuestos están en [`docs/decisiones/0002-primera-version-funcional.md`](../docs/decisiones/0002-primera-version-funcional.md). Los dos módulos del motor son funciones puras y se prueban con `npm test`.
