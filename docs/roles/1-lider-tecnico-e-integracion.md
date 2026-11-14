# Rol 1 — Líder técnico e integración

> **Para tu IA:** eres asistente del líder técnico de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. El contexto completo está en `docs/00-contexto-general.md` y los formatos en `docs/contrato-datos.md`. Tu prioridad es que exista **un flujo completo funcionando y publicado** al final del día, aunque tenga menos funciones. Ayuda a decidir qué recortar.

## Entregable del día

> En la primera hora define el contrato de entrada y salida del motor y sube un ejemplo con datos falsos. Arma el flujo completo y publica la PWA en un hosting estático con HTTPS, que es requisito para que funcione sin conexión. Decide qué recortar.

## Qué construye el equipo (en una línea)

Una PWA sin backend que compara el plan actual de un productor de maíz de temporal en Yucatán con una rotación alternativa. Usa dos criterios: **exposición a rachas secas**, calculada con lluvia NASA POWER / GPM IMERG, y **cobertura del suelo**. El peso de cada criterio depende de la prioridad que elija el productor.

## Tus tareas, en orden

### Hora 0–1: contrato y esqueleto

1. Revisa `docs/contrato-datos.md` (v0.1). Ajusta lo necesario y **congélalo como v0.1** en la rama principal de trabajo.
2. Sube estos archivos falsos que respetan el contrato, para que nadie espere a nadie:
   - `app/data/clima.json` (puede ser el ejemplo del contrato con 2–3 temporadas),
   - `app/data/planes.json` y `app/data/reglas.json` (copiados del contrato),
   - `app/data/parcela-ejemplo.json` (la entrada del contrato),
   - `app/fixtures/salida-ejemplo.json` (la salida del contrato).
3. Crea el esqueleto del repositorio (ver la sección 7 del contexto general). Elige el stack. Recomendación: **HTML, CSS y JS sin framework, o Vite + JS**. Es lo más rápido para una PWA y no exige un servidor.
4. Asigna las ramas y avisa a cada rol qué archivo es suyo.

### Hora 1–2: publicación temprana

5. Publica el esqueleto en el hosting desde ya. Opciones: **GitHub Pages**, Netlify o Vercel. Todas dan HTTPS.
   - El *service worker* y `navigator.geolocation` **solo funcionan con HTTPS** (o en `localhost`).
   - En GitHub Pages bajo `/<repo>/`, cuida las rutas relativas en `manifest.webmanifest`, en `start_url` y en el alcance del *service worker*.
6. Configura un despliegue automático desde la rama de integración, por ejemplo con una GitHub Action para Pages.

### Durante el día: integración

7. Une las piezas en este orden:
   1. UI de captura (Rol 5) con datos falsos y `comparar` falso,
   2. motor real (Rol 4),
   3. `clima.json` real (Rol 2),
   4. reglas reales (Rol 3),
   5. UI de resultados (Rol 6).
8. Comprueba que cada integración pase el **flujo completo**:
   1. abrir la app,
   2. cargar la parcela de ejemplo,
   3. elegir la prioridad,
   4. ver la comparación,
   5. ver el «¿Por qué?»,
   6. activar el modo avión,
   7. recargar,
   8. comprobar que todo sigue funcionando.
9. Vigila que se cumplan las **reglas de honestidad de datos**:
   - etiqueta «dato de ejemplo»,
   - fuente y fecha de corte visibles,
   - aviso de que no es un pronóstico.

## Qué recortar, por orden

Recorta en este orden si el tiempo no alcanza:

1. **Primero:** la temperatura (`T2M_MAX`), SMAP y las gráficas de la serie diaria.
2. **Después:** GPS. Basta con la lista de municipios, o incluso con un solo municipio fijo.
3. **Después:** más de un municipio con clima. Basta con un punto.
4. **Después:** guardar la parcela en el teléfono. Se puede recargar el ejemplo cada vez.
5. **Nunca se recorta:**
   - la comparación de dos planes con dos criterios,
   - el «¿Por qué salió esto?» con el dato de la NASA y su fecha,
   - el funcionamiento sin conexión,
   - la publicación en HTTPS.

## Decisiones que te tocan

| Decisión | Recomendación | Por qué |
|---|---|---|
| ¿IMERG o PRECTOTCORR? | **IMERG** (1998–2025, unos 10 km) | Es dato satelital de la NASA con mejor resolución. PRECTOTCORR llega hasta 1981, pero con unos 50 km de rejilla. |
| ¿Backend? | **No** | La PWA estática basta y es más robusta en la demo. |
| ¿Cuántos municipios con clima? | **1** (punto 20.49 N, −89.75 O) | Si sobra tiempo, el Rol 2 genera más. |
| ¿Un idioma? | Español | El usuario es un productor de Yucatán. El pitch puede ir en inglés. |

## Criterios de terminado

- [ ] Contrato v0.1 publicado en la primera hora y ejemplos falsos en el repo.
- [ ] URL HTTPS pública que carga la app.
- [ ] La app se puede instalar (manifest con iconos) y funciona en modo avión después de la primera visita.
- [ ] El flujo completo funciona con datos reales de NASA POWER.
- [ ] El README explica cómo correr la app, de dónde salen los datos y qué es dato de ejemplo.

## Riesgos que debes vigilar

- **Cambios de contrato a mitad del día.** Si son inevitables, sube la versión y avisa a todos.
- **Cachés del *service worker* durante el desarrollo.** Versiona el nombre de la caché para no ver código viejo.
- **Rutas en GitHub Pages.** Revísalas antes de la demo.
- **Wi‑Fi del evento.** Lleva la app ya instalada en el teléfono de la demo.
