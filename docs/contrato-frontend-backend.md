# Contrato frontend ↔ backend del prototipo (v0.1)

Este documento cuenta cómo la PWA (`app/`) usa la API que hoy existe en `server/`, qué entidades guarda y dónde están las brechas en cada sentido.

Las propuestas marcadas **PENDIENTE DE APROBACIÓN** no están construidas. Necesitan la decisión del equipo antes de implementarse.

Los esquemas JSON de lo que maneja la PWA están en `shared/schemas/`.

## 1. Principios que respeta el prototipo

- **Offline-first.** Todo se captura y se guarda primero en IndexedDB (`app/src/storage`). Si no hay red, la app sigue funcionando y la cola reintenta (RF-09).
- **Sin cuentas ni parcelas en el servidor (RNF-03).** La parcela completa (nombre, ubicación exacta, foto) nunca sale del teléfono. Al servidor solo viajan:
  - el consentimiento (`POST /consent`);
  - las contribuciones seudónimas por cultivo y temporada (`POST /contributions`).
- **Consentimiento antes de enviar (RF-10).** Sin un `consent_id` con `granted=true` y `purpose="collective_statistics"` no se encola ninguna contribución.
- **Los datos de ejemplo nunca se envían.**
- **No se predicen rendimientos.** Predicción a futuro muestra señales con evidencia; no da probabilidad de éxito ni kilos esperados.

## 2. Endpoints que ya existen y cómo los usa la PWA

Base: `http://localhost:8000/api/v1`. Se configura con `window.JAIBASPACE_API_BASE` en `index.html` o con `?api=` en la URL. Archivo: `app/src/services/api/endpoints.js`.

| Endpoint | Uso en la PWA | Pantalla | Si falla o viene vacío |
|---|---|---|---|
| `GET /health` | Al arrancar y al volver la red: estado «Conectado» o «Sin conexión» | Información | Modo local |
| `GET /ready` | Cliente listo; no se muestra en la interfaz | — | — |
| `POST /consent` | `{consent_id, purpose:"collective_statistics", granted, notice_version:"2026-11-prototipo", decided_at}`. Retirarlo crea un registro nuevo con `granted=false` | Información → «Comparte con tu zona» | Se queda en la cola. Un 409 cuenta como ya enviado |
| `POST /contributions` | Una por cada siembra de una temporada cerrada. Cabecera `Idempotency-Key = submission_id` | Información (al terminar una siembra o al registrar una pasada) y alta de parcela con «Sí, ya se usó» | Cola: pendiente → enviada \| error, con «Reintentar» |
| `GET /catalogs/{crops\|seeds}` | Catálogo de cultivos y semillas | Semillas, Parcelas | Hoy responde `[]`, así que se usa `app/data/catalogos/*.json` (marcado como ejemplo) y la pantalla lo dice |
| `GET /climate/datasets?zone_id&kind=projection` | Variable «Clima que viene» | Predicción | Hoy responde `[]` y se muestra «Sin dato todavía» |
| `GET /statistics?zone_id&crop_id&season_year` | Variable «Productores de tu zona» y tarjeta «Lo que reportan en…» | Predicción, Información | `insufficient_sample` (menos de 10 registros) o sin conexión: se explica y no se muestran números |

**Configuración del servidor.** CORS solo permite `GET`, `POST`, `OPTIONS` y las cabeceras `Content-Type` e `Idempotency-Key`. El origen por defecto es `http://localhost:5173`, el puerto de `npm run dev` de la PWA. Para desplegar hay que poner el dominio real en `CORS_ORIGINS`.

### Ejemplo de contribución que envía la PWA

```json
{
  "submission_id": "6f1e0d4c-0c3a-4b9e-9a51-2f3f5f0a2b11",
  "consent_id": "0b6f2c1e-8b0d-4a77-9a35-5d0d6a0a7c42",
  "zone_id": "yuc-noroeste",
  "crop_id": "maiz",
  "variety_id": "criollo",
  "season_year": 2026,
  "sowing_date": "2026-06-15",
  "harvest_date": "2026-11-14",
  "outcome": "regular",
  "perceived_cause": "sequia",
  "quantity": 20,
  "quantity_unit": "costal",
  "quantity_is_estimate": true
}
```

- `outcome`: «Bien» → `good`, «Regular» → `regular`, «Mal» → `poor`.
- `perceived_cause`: `sequia | exceso_lluvia | plaga | viento | otra` (con «otra: texto» si la persona lo escribe).
- `sowing_date` y `harvest_date` solo se mandan si la persona dio el día exacto. Si solo dio el mes o el año, van en `null` (ver brecha F2).

## 3. Entidades: cómo se corresponden

| Modelo E-R (`docs/diagramas`) | En la PWA (IndexedDB) | En la API hoy | Notas |
|---|---|---|---|
| USUARIO_DEMO | `kv.usuario {nombreVisible}` | — | Solo local; no hay cuentas |
| PARCELA | `parcelas` (`shared/schemas/parcela.schema.json`) | — | Local por diseño. `superficie_ha` se guarda como `superficieM2`. Se agregan `unidadCaptura`, `dimensiones`, `sueloTexto`, `usadaAntes`, `usoPrevio`, `aniosSeguidos`, `prioridad`, `plan`, `foto`, `eliminadaEn` y `motivoEliminacion` |
| MUNICIPIO | `municipioId`, `municipioNombre`, `estado` | — | Catálogo aproximado sin `clave_inegi` (ver B5) |
| ZONA_AGROCLIMATICA | `zonaId`, `zonaDistanciaKm`, `origenAsignacionZona = punto_mas_cercano` | `zone_id` en contribuciones y estadísticas | 3 de las 7 zonas tienen datos |
| TIPO_SUELO | `tipoSueloId` + `origenTipoSuelo` (`texto_reconocido \| texto_productor \| desconocido`) | — | Texto libre reconocido con `catalogos/soils.json`; si no se reconoce, queda en `null` |
| TEMPORADA_AGRICOLA | `temporadas` | Se aplana en ContributionCreate | `estado`, `resultado`, `causa`, `fechaCosecha` con precisión, `cosechas` por siembra, `prediccion` (lo que decían las señales al iniciar), `origen` y `envios` |
| SIEMBRA | `siembras` | `crop_id`, `variety_id`, `sowing_date` | Lleva `superficieM2`, `fecha {anio, mes, dia, precision}`, `eliminadaEn` y `motivo` |
| CULTIVO / VARIEDAD / Semilla | `catalogos/crops.json`, `seeds.json` | `GET /catalogs/crops\|seeds` | La semilla trae `ventanaSiembra`, `cicloDias`, `porConfirmar` |
| EtapaCultivo | `reglas.json → cultivos.*.etapas` | `GET /catalogs/stages` (vacío) | El motor usa `reglas.json` directamente |
| CONSENTIMIENTO | `kv.consentimiento` | `POST /consent` | |
| CambioPendiente | `cola` | — | `{tipoEntidad, entidadId, payload, estado, intentos, ultimoError}` |
| CONJUNTO_CLIMATICO | `app/data/clima/*.json` | `GET /climate/datasets` | Histórico local; proyección vacía |
| EstadisticaAgregada | — | `GET /statistics` | Solo conteos por resultado |
| (nuevo) Evento de historial de parcela | `historial` | — | Ver F4 |
| (nuevo) Sabucán | `kv.sabucan` | — | Ver F6 |

## 4. Lo que el backend o los datos tienen y el frontend aún no muestra

| # | Qué hay | Estado en el front | Propuesta |
|---|---|---|---|
| B1 | **Comparación de estrategias** (`planes.json`, `pesosPorPrioridad`, criterios de cobertura de suelo, nitrógeno e ingreso) | No se muestra. Se guarda la prioridad del productor en la parcela para usarla después | Sección «Opciones de manejo» dentro de Predicción, con el diseño de tarjetas y letreros actual. **PENDIENTE DE APROBACIÓN** |
| B2 | Entidades ESTRATEGIA, CICLO_ESTRATEGIA y CULTIVO_DEL_CICLO | No existen en el front. «¿Cuántos años seguidos la has sembrado?» y el plan de la parcela nueva son la semilla de esto | Definir con Rol 3 si el productor arma su estrategia o la elige de `planes.json` |
| B3 | `GET /catalogs/varieties` y `/stages` | La variedad viaja dentro de la semilla y las etapas salen de `reglas.json` | Publicar los catálogos y cambiar la fuente en `modules/crops/catalogo.js` |
| B4 | Idioma maya (RNF) | Solo acentos bilingües (`i18n/myn.js`, por validar) | Modo completo en maya cuando haya traducción validada |
| B5 | MUNICIPIO con `clave_inegi` | Catálogo aproximado de 30 cabeceras, con `claveInegi = null` | Cargar el catálogo oficial de INEGI en el pipeline |
| B6 | 7 zonas agroclimáticas previstas | Solo hay 3 con clima. La PWA asigna la más cercana y avisa si está a más de 50 km | Rol 2: completar zonas |
| B7 | `GET /ready` | No se usa en la interfaz | Mostrar «servidor sin base de datos» si hace falta |
| B8 | Revocación con fecha (`Consentimiento.revocadoEn` en el diagrama de clases) | Se registra un consentimiento nuevo con `granted=false` | Endpoint `PATCH`/`POST /consent/{id}/revoke` si se requiere trazabilidad |

## 5. Lo que el frontend captura y el backend aún no recibe

| # | Dato de la PWA | Hoy | Propuesta |
|---|---|---|---|
| F1 | **Perfil de parcela**: superficie, suelo, uso previo, años seguidos, prioridad | Solo local (RNF-03) | Agregar a ContributionCreate campos generalizados y opcionales: `soil_id`, `area_bucket` (p. ej. `<1 ha`, `1–5 ha`), `previous_use`, `continuous_years`, `priority`. Sirven para estadísticas sin exponer la parcela. **PENDIENTE DE APROBACIÓN** |
| F2 | **Precisión de fechas** (año, mes o día, como en `SIEMBRA.precision_fecha`) | El contrato solo acepta fecha completa, así que se manda `null` | Agregar `sowing_month`, `harvest_month` y `date_precision` a ContributionCreate y a la migración |
| F3 | **Cosecha por cultivo y resultado por temporada** | La PWA pide un resultado por temporada y una cantidad por cultivo | Aclarar el modelo: el E-R pone el resultado en TEMPORADA; el diagrama de clases, en RegistroTemporada por cultivo |
| F4 | **Motivos de eliminación** de semillas y parcelas, e **historial de parcela** | Solo local; alimentan el historial y la señal de plagas | `POST /api/v1/removal-reasons` seudónimo y con consentimiento: `{submission_id, consent_id, zone_id, crop_id?, kind: "seed"\|"parcel", reason_id, month, year}`. Los agregados irían en `/statistics`. **PENDIENTE DE APROBACIÓN** |
| F5 | **Lo que decían las señales al iniciar la temporada** | Se guarda en `temporada.prediccion` y se compara con el resultado real en Información | Agregar `signals_level` (`bien\|atencion\|riesgo`) a la contribución para calibrar el motor con datos reales |
| F6 | **Sabucán** (semillas apartadas) | Solo local, marcado «Pendiente en el servidor» | Definir si es una lista de interés, disponibilidad de semilla por zona (`Semilla.disponibilidad`) o un intercambio. Sin cuentas no puede sincronizarse entre teléfonos |
| F7 | **Catálogos de captura**: suelos, municipios, causas, unidades, temporadas del año | Fixtures en `app/data/catalogos` | Sumar `soils`, `municipalities`, `causes`, `units` y `seasons` a `CatalogService.allowed_catalogs` |
| F8 | **Estadística por causa percibida** | `/statistics` solo cuenta resultados | Agregar métricas `cause_{id}_count` con el mismo umbral mínimo |
| F9 | **Foto de parcela y notas dictadas** | Solo local | Se quedan así por privacidad |

## 6. Predicción a futuro: qué falta para implementarla completa

Todo esto queda **comentado y sin construir** hasta que el equipo decida.

1. **Escenarios climáticos.** Falta definir la fuente, los escenarios y los periodos (Rol 2). Cuando `/climate/datasets?kind=projection` traiga algo, hay que acordar cómo traducirlo a señal; hoy se muestra «Sin dato todavía».
2. **Plagas por zona.** No hay fuente externa. La señal de plagas usa solo lo que reporta el productor: causas de cosecha y motivos de eliminación. Para tener una señal de zona se necesitan F4 y F8, o una fuente oficial.
3. **Viento y huracanes.** No están en el pipeline. NASA POWER ofrece viento (`WS2M`, `WS10M_MAX`) y podría sumarse a `data-pipeline/clima.py`.
4. **Humedad del suelo.** NASA POWER tiene `GWETROOT` y `GWETTOP`. Ayudaría a la señal de siembra («¿ya hay humedad?»).
5. **Umbrales de nivel.** El prototipo usa atención desde 1 de cada 3 años y riesgo desde 2 de cada 3 (`motor/prediccion.js → UMBRALES`). Rol 3 debe validarlos.
6. **Etapas de frijol, calabaza y chile.** Sin ellas, esos cultivos no se miden por etapa y su nivel tiene tope en «atención».
7. **Señales calculadas en el servidor.** Hoy el motor corre en la PWA con los JSON del pipeline. Para unificar, se propone `GET /api/v1/signals?zone_id&crop_id&sowing=MM-DD&soil_id`, que devuelva la misma estructura que `motor/prediccion.js` (id, nivel, tipo histórico/actual/ambos, frase, justificación, fuente, periodo, n, porConfirmar). **PENDIENTE DE APROBACIÓN**
8. **Comparación de estrategias** (B1).

## 7. Calendario de Inicio

El calendario no tiene endpoint. La PWA lo calcula en `motor/calendario.js` con los mismos archivos del pipeline, y la sección 3.3 de `docs/look-and-feel.md` explica cada color.

Propuesta: `GET /api/v1/calendar?zone_id&year&month` que devuelva `[{date, kind: "clima"|"prevision"|"siembra"|"temporada", text, detail, data_type: "historico"|"actual"|"catalogo", source}]` para que el servidor pueda sumar escenarios y avisos. **PENDIENTE DE APROBACIÓN**

## 8. Errores

El cliente (`services/api/client.js`) entiende dos formatos:

- `{error:{code,message}}`, que es `AppError`;
- `{detail}`, que es `HTTPException`; por ejemplo, el 404 `unknown_catalog`.

Si no hay respuesta, se considera «sin conexión»: lo pendiente se queda en la cola. Si hay un 4xx, pasa a «error» con el código visible.
