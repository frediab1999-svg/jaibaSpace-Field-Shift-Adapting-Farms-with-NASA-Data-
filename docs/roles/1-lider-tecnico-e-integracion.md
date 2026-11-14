# Rol 1 — Líder técnico e integración

> **Para tu IA:** eres asistente del líder técnico de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. El contexto completo está en `docs/00-contexto-general.md`, el texto oficial en `docs/reto-oficial.md` y los formatos en `docs/contrato-datos.md` (v0.2). Tu prioridad es que exista **un flujo completo funcionando y publicado** al final del día, aunque tenga menos funciones. Ayuda a decidir qué recortar.

## Entregable del día

> En la primera hora congela el contrato v0.2 y sube ejemplos con datos falsos. Arma el flujo completo y publica la PWA estática en un hosting HTTPS, requisito para que funcione sin conexión. Decide qué recortar.

## Qué construye el equipo (en una línea)

Una PWA sin backend que ayuda a un productor de temporal de la **Península de Yucatán** a explorar **4 estrategias de rotación** (actual, cobertura, milpa y relevo) con 5 criterios: rachas secas y estrés por calor (datos NASA de su zona), cobertura del suelo, fijación de nitrógeno e ingreso o forraje. El tipo de suelo ajusta el cálculo y la prioridad del productor cambia el peso de cada criterio.

## Tus tareas, en orden

### Hora 0–1: contrato y esqueleto

1. Revisa `docs/contrato-datos.md` (v0.2). Ajusta lo necesario y **congélalo** en `develop`.
2. Sube estos archivos que respetan el contrato, para que nadie espere a nadie:
   - `app/data/zonas.json` (la sección 1 del contrato),
   - `app/data/clima/yuc-noroeste.json` (si el Rol 2 aún no lo genera, el ejemplo del contrato con 2–3 temporadas y `"esEjemplo": true`),
   - `app/data/planes.json` y `app/data/reglas.json` (copiados del contrato),
   - `app/data/parcela-ejemplo.json` (la entrada del contrato),
   - `app/fixtures/salida-ejemplo.json` (la salida del contrato, con los 4 planes).
3. Crea el esqueleto del repositorio (sección 7 del contexto general): PWA con HTML, CSS y JavaScript sin framework, o Vite + JS. La PWA no necesita servidor.
4. Asigna las ramas y avisa a cada rol qué archivos son suyos.

### Hora 1–2: publicación temprana

5. Publica el esqueleto en el hosting desde ya: **GitHub Pages**, Netlify o Vercel. Todas dan HTTPS.
   - El *service worker* y `navigator.geolocation` **solo funcionan con HTTPS** (o en `localhost`).
   - En GitHub Pages bajo `/<repo>/`, cuida las rutas relativas en `manifest.webmanifest`, `start_url` y el alcance del *service worker*.
6. Configura un despliegue automático desde `develop`, por ejemplo con una GitHub Action para Pages.

### Durante el día: integración

7. Une las piezas en este orden:
   1. UI de captura (Rol 5) con datos falsos y un `comparar` falso,
   2. motor real (Rol 4),
   3. clima real de las zonas (Rol 2),
   4. reglas y planes reales (Rol 3),
   5. UI de resultados y vista de península (Rol 6).
8. Comprueba que cada integración pase el **flujo completo**:
   1. abrir la app,
   2. cargar la parcela de ejemplo,
   3. elegir suelo y prioridad,
   4. ver las 4 estrategias ordenadas,
   5. abrir el «¿Por qué?» de una estrategia,
   6. cambiar de zona (por ejemplo, a Quintana Roo) y ver que el resultado cambia,
   7. activar el modo avión, recargar y comprobar que todo sigue funcionando.
9. Vigila que se cumplan las **reglas de honestidad de datos**:
   - etiqueta «dato de ejemplo»,
   - zona y distancia al punto de datos visibles,
   - fuente y fecha de corte de lluvia y temperatura visibles,
   - aviso de que no es un pronóstico de cosecha,
   - aviso de que la herramienta apoya y no reemplaza el juicio del productor.

## Qué recortar, por orden

Recorta en este orden si el tiempo no alcanza:

1. **Primero:** la vista comparativa de la península, la ayuda «¿Qué significa?» y las gráficas.
2. **Después:** GPS. Basta con la lista de municipios.
3. **Después:** bajar de 7 zonas a **3 (una por estado)**: `yuc-noroeste`, `camp-chenes`, `qroo-centro`.
4. **Después:** guardar la parcela en el teléfono. Se puede recargar el ejemplo cada vez.
5. **Después:** el estrés por calor. Quedan 4 criterios.
6. **Nunca se recorta:**
   - la comparación de **al menos 3 estrategias**, incluida la actual,
   - el «¿Por qué?» con evidencia, beneficios, riesgos y lo que falta confirmar,
   - el tipo de suelo influyendo en el cálculo,
   - el dato de la NASA con su fecha,
   - el funcionamiento sin conexión,
   - la publicación en HTTPS.

## Decisiones que te tocan

| Decisión | Recomendación | Por qué |
|---|---|---|
| ¿IMERG o PRECTOTCORR? | **IMERG** (1998–2025, unos 10 km) | Dato satelital de la NASA con mejor resolución. PRECTOTCORR llega a 1981, pero con unos 50 km de rejilla. |
| ¿Backend? | **No** | La PWA estática basta, es más robusta en la demo y funciona offline. |
| ¿Cuántas zonas? | **7**; mínimo 3 (una por estado) | El script tarda segundos por zona; cada archivo pesa unos 120 KB. |
| ¿Cuántas estrategias? | **4** | El reto sugiere al menos 3, incluida la actual. |
| ¿Pronóstico de 7 días? | **No** en el MVP | El reto no lo pide y agrega riesgo (proveedor externo, CORS, caducidad). |
| ¿Un idioma? | Español | El usuario es un productor de la península. El pitch puede ir en inglés. |

## Criterios de terminado

- [ ] Contrato v0.2 congelado en la primera hora y ejemplos falsos en el repo.
- [ ] URL HTTPS pública que carga la app.
- [ ] La app se puede instalar (manifest con iconos) y funciona en modo avión después de la primera visita.
- [ ] El flujo completo funciona con datos reales de NASA POWER en al menos 3 zonas.
- [ ] El README explica qué hace la app, cómo correrla, de dónde salen los datos y qué es dato de ejemplo.

## Riesgos que debes vigilar

- **Cambios de contrato a mitad del día.** Si son inevitables, sube la versión y avisa a todos.
- **Cachés del *service worker* durante el desarrollo.** Versiona el nombre de la caché para no ver código viejo.
- **Rutas en GitHub Pages.** Revísalas antes de la demo.
- **Wi‑Fi del evento.** Lleva la app ya instalada en el teléfono de la demo.
