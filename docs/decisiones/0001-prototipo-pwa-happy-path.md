# 0001. Prototipo funcional de la PWA para el happy path

- **Estado:** propuesta, lista para revisión
- **Fecha:** 2026-11-14
- **Contexto:** El equipo necesita un prototipo navegable para la presentación ante jueces. Debe seguir el happy path (Inicio → Menú → Semillas de temporada, Tus parcelas, Predicción a futuro, Información) y usar el diseño ya aprobado. También debe servir como guía para construir el backend.

## Decisiones

1. **JavaScript sin framework, con módulos ES y Vite solo como servidor de desarrollo y empaquetador.** Lo pide la arquitectura («PWA en JavaScript»). Se evita fijar un framework antes de definir el contrato. Vite usa el puerto 5173, el mismo que el CORS por defecto del servidor.
2. **Estructura de carpetas de `docs/arquitectura-y-estructura.md`:**
   - `src/app` (rutas y estado);
   - `src/modules/{parcel,crops,strategies,harvests,climate,statistics}`;
   - `src/services/{api,sync}`, `src/storage`, `src/i18n`, `src/shared`;
   - `src/ui/{pantallas,captura,resultados,componentes,styles}`;
   - `src/motor`.
3. **Parcelas locales.** El servidor no tiene endpoint de parcelas y RNF-03 lo prohíbe. El CRUD completo de parcelas, semillas, historial y motivos vive en IndexedDB. Al servidor solo van el consentimiento y las contribuciones seudónimas.
4. **Catálogos con respaldo local.** Primero se llama a `GET /catalogs/*`. Si responde vacío o no hay red, se usan fixtures en `app/data/catalogos`, marcados `esEjemplo` y con `porConfirmar`.
5. **Predicción como señales, no como probabilidad.** Se sustituye el porcentaje de éxito del diseño por «x de y señales a favor». Cada señal declara si su dato es histórico, actual o ambos, su fuente y lo que falta. Así se respeta «no predice rendimientos». En lugar de «cosecha estimada» se muestra la referencia oficial del municipio cuando existe (SADER/DGSIAP, en `planes.json`).
6. **Motor en el cliente.** Las exposiciones a rachas secas y calor se calculan en la PWA con los JSON del pipeline, para que funcione sin conexión. Se propone mover el cálculo a `/signals` si el equipo lo aprueba.
7. **Mapa con Leaflet incluido en el repositorio y teselas de OpenStreetMap o Esri.** Sin red, la ubicación sale del GPS o del municipio.
8. **Fuentes tipográficas incluidas en el repositorio (OFL).** Así no dependen de Google Fonts y la PWA funciona sin conexión.
9. **Datos de ejemplo explícitos.** Botón «Ver con parcelas de ejemplo». Llevan el sello «Ejemplo» y nunca se envían.

## Consecuencias

- El backend puede construirse sobre `docs/contrato-frontend-backend.md` y `shared/schemas/`.
- Las brechas F1 a F9 y B1 a B8, y las propuestas «pendiente de aprobación», necesitan decisión antes de implementarse.
- Para la demostración no hace falta levantar el servidor: sin él, la app trabaja en modo local y lo dice.
