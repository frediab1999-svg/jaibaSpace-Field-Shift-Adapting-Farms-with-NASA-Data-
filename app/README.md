# PWA Milpa (jaibaSpace)

Prototipo funcional, offline-first, del happy path:

- Inicio, Menú, Semillas de temporada, Tus parcelas, Predicción a futuro, Información y **Opciones para tu parcela** («¿Qué siembro el próximo ciclo?»).
- Está hecho en JavaScript sin framework, con módulos ES. Vite solo se usa para el servidor de desarrollo y el empaquetado.

- Guía visual: [`docs/look-and-feel.md`](../docs/look-and-feel.md)
- Contrato con la API y brechas: [`docs/contrato-frontend-backend.md`](../docs/contrato-frontend-backend.md)
- Decisión de arquitectura: [`docs/decisiones/0001-prototipo-pwa-happy-path.md`](../docs/decisiones/0001-prototipo-pwa-happy-path.md)

## Cómo correrla

Necesitas Node.js 18 o más reciente.

```bash
cd app
npm install
npm run dev        # http://localhost:5173
```

- **Con el servidor.** En otra terminal, levanta la API (ver `server/`, por ejemplo con `docker compose up`). La PWA la busca en `http://localhost:8000/api/v1`. Para usar otra URL, abre la app con `?api=https://tu-servidor/api/v1` o cambia `window.JAIBASPACE_API_BASE` en `index.html`.
- **Sin el servidor.** Todo funciona en modo local y la app lo indica en Información.
- **Para producción:** `npm run build`. Genera `app/dist/`, que se publica como sitio estático con HTTPS para que funcionen el service worker, el GPS y el micrófono.
- **Pruebas:** `npm test`, que corre las funciones del motor con `node:test`.

### Usarla sin internet (modo avión)

1. Abre la app **una vez con red** y espera unos segundos: aparece el aviso «Lista para usar sin internet».
2. Desde ahí todas las pantallas, los datos de NASA de las tres zonas, las parcelas de ejemplo, las imágenes y las letras salen de la copia guardada.
3. Para la demo se recomienda la versión empaquetada: `npm run build && npm run preview -- --host`. Con `npm run dev` también funciona, pero recarga la página una vez antes de quitar la red.

Lo que **no** funciona sin internet: las teselas del mapa (queda el GPS y el municipio de respaldo), el reconocimiento de voz de Chrome (aparece el campo para escribir) y el envío al servidor (se queda en la cola y sale cuando vuelve la red). La lectura en voz alta («Escuchar») funciona sin red si el teléfono tiene una voz en español instalada.

> No abras `index.html` con doble clic: los módulos ES y el service worker necesitan un servidor (`npm run dev` o `npm run preview`).

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
   - «Tierra desnuda en 2 años»: 7, 9, 14 y 15 meses.
   - Cambia «¿Qué te importa más?» de agua a nitrógeno: el orden de las tarjetas cambia.
   - En la Milpa del cenote (Tsek'el) la soya sale como «No recomendable en tu suelo»; en el Solar de Xbalam (K'ankab) sale como opción.
   - Toca «Escuchar» en una tarjeta o «Escuchar las opciones»: la app la lee en voz alta.
   - Abre «¿Por qué?» de la milpa con canavalia: evidencia, riesgos, lo que falta confirmar y fuentes.
   - «Quiero probar esta» la guarda y abre el calendario en junio con las fechas de esa opción.
7. **Información.**
   - «Terminar siembra» de la temporada en curso (ya pasó la cosecha estimada del maíz de ejemplo).
   - Compara la predicción contra el resultado real y abre una temporada pasada para ver lo que midió NASA ese año.
   - Acepta compartir: las contribuciones se encolan y se envían cuando hay servidor.

## Estructura

```text
app/
├── index.html
├── public/                 manifest.webmanifest, sw.js, icons/   (Vite los sirve en la raíz)
├── data/                   zonas, clima (pipeline NASA), reglas, planes y catalogos/ (fixtures marcados)
├── fixtures/               ejemplo-milpa.json (parcelas de ejemplo)
├── src/
│   ├── main.js             arranque y rutas
│   ├── app/                router por hash, estado de sesión y precarga para usarla sin internet
│   ├── services/api/       cliente HTTP y endpoints reales de /api/v1
│   ├── services/sync/      cola de envíos (pendiente → enviada | error)
│   ├── storage/            IndexedDB con respaldo en localStorage
│   ├── modules/
│   │   ├── parcel/         CRUD, zona más cercana, esquema del terreno, ejemplo
│   │   ├── crops/          catálogos, suelo escrito → catálogo, semáforo por mes y zona
│   │   ├── harvests/       temporadas, cosechas, consentimiento, contribuciones
│   │   ├── climate/        exposición histórica a rachas y calor, escenarios
│   │   ├── strategies/     reglas y planes (comparación pendiente de aprobación)
│   │   └── statistics/     (consulta en services/api/endpoints.js)
│   ├── motor/              prediccion.js (señales) y calendario.js (colores del calendario)
│   ├── ui/
│   │   ├── pantallas/      inicio, menu, semillas, parcelas
│   │   ├── captura/        formulario de parcela, mapa, siembra, motivo de eliminación
│   │   ├── resultados/     predicción, información, opciones (+ opciones-datos y opciones-ejemplo)
│   │   ├── componentes/    terreno, franja24 (24 meses cubierta o desnuda)
│   │   └── styles/         tokens, base, componentes, pantallas
│   ├── i18n/               es y maya (acentos por validar)
│   ├── shared/             dom, formatos, íconos, imágenes, datos
│   ├── assets/             imágenes y fuentes (OFL)
│   └── vendor/leaflet/     Leaflet 1.9.4 (BSD-2)
└── tests/                  pruebas del motor
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

## Conectar el motor de comparación (Rol 4)

Hoy la pantalla de Opciones usa una **salida de ejemplo** (`src/ui/resultados/opciones-ejemplo.js`) con los números del Rol 3 para Umán. Cuando `src/motor/estrategias.js` pase sus pruebas, en `src/ui/resultados/opciones-datos.js`:

1. quita las `//` de la línea que importa `compararEstrategias`;
2. cambia `compararEjemplo` por `compararEstrategias` en la línea de `comparar`.

La forma que espera la pantalla está documentada arriba de ese archivo. Los avisos de «números de Umán» desaparecen solos.
