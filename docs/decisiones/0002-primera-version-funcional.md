# 0002. Primera versión funcional: PWA conectada a FastAPI y comparación calculada en el teléfono

- **Estado:** implementada, lista para revisión del equipo
- **Fecha:** 2026-11-15
- **Punto de partida:** `develop` en el commit `89f5fca` (incluye el PR #11, que movió el piloto a Tekax)
- **Contexto:** El prototipo (decisión 0001) mostraba «Opciones para tu parcela» con una salida de ejemplo de números fijos, y FastAPI respondía catálogos y clima con listas vacías. Esta versión conecta todo: la PWA descarga los datos de FastAPI, los guarda en el teléfono y calcula la comparación ahí.

## Qué quedó construido

1. **Servidor.** PostgreSQL/PostGIS guarda el contenido publicado (zonas, clima, planes, reglas y catálogos), un índice de conjuntos climáticos y un perfil ficticio de demostración con sus parcelas. La carga es `python -m app.seed`, idempotente.
2. **PWA.** Al abrir, pide el manifiesto `GET /api/v1/bundle`, descarga los 11 documentos, comprueba tamaño y SHA-256, valida que sean coherentes entre sí y guarda el paquete completo en IndexedDB.
3. **Motor.** `app/src/motor/estrategias.js` y `app/src/motor/comparacion.js` calculan en el teléfono los meses estimados con cultivo en pie y la exposición histórica a rachas secas y calor. Ya no hay números fijos en la pantalla.
4. **Recorrido.** Sin login: cargar la demo, abrir «Opciones para tu parcela», comparar tres alternativas, ver el «¿Por qué?», guardar un plan y volver a abrirlo. Después de la precarga, todo funciona sin conexión.

## Decisiones y ajustes respecto a lo pedido

### 1. El piloto es Tekax, no Umán

El encargo se escribió contra el commit `039c237`, cuando la zona era Umán (`yuc-noroeste`). En `develop` actual el equipo ya movió el piloto a Tekax (`yuc-sur`, 19.8122, −89.4702) y borró el clima de Umán. Se respetó ese cambio:

- La parcela de demostración está en Tekax, en el punto de la zona, con municipio declarado.
- El **caso de control de Umán** se conserva como prueba reproducible con sus entradas originales: maíz sembrado el 15 de junio, etapa del día 55 al 94, rachas de 5 días o más. Da **14 de 28 temporadas**. Con las etapas vigentes (Sac Beh, días 80 a 129) el resultado es otro, y la prueba lo comprueba.
- Con el clima de Tekax, el motor reproduce los resultados que publicó el Rol 3: 25 de 28 años y 21.1 % de los días para el maíz; 27 de 28 y 15.7 % para soya y maíz.

Al aplicar el cambio de zona, el frontend quedó roto en `develop`: seguía buscando `yuc-noroeste` en el calendario, la predicción, el mapa de semillas y las pruebas. Eso se corrigió.

### 2. Las tres opciones y sus fechas

| Opción | Plan | Fechas | Meses con cultivo en pie (de 24) |
|---|---|---|---:|
| a) Práctica actual | Lo registrado por el productor, o la plantilla «Maíz continuo de ejemplo» | Maíz: 15-jun a 12-nov | 10 |
| b) Maíz con canavalia intercalada | `milpa-canavalia` (nuevo en `planes.json`) | Maíz: 15-jun a 12-nov. Canavalia: 15-jul a 29-nov | 12 |
| c) Un ciclo de canavalia y luego maíz | `cobertura` | Canavalia: 15-jun a 30-oct. Maíz: 15-jun a 12-nov | 10 |

- **La práctica actual** sale de la temporada más reciente de la parcela. Se conserva todo lo declarado (maíz, frijol, calabaza), pero el cálculo solo cubre los cultivos con etapas en `reglas.json` y la pantalla lo dice. Se respeta la fecha exacta; si solo se conoce el mes, se usa el día 15 y se declara. Si no hay nada evaluable, se usa la plantilla y se marca como tal.
- **La canavalia intercalada no estaba en `planes.json`.** Se agregó como escenario ilustrativo (`escenarioIlustrativo`, formato 0.4). Sus dos fechas no están medidas en Tekax:
  - **Siembra 30 días después del maíz.** La respalda un ensayo de Centroamérica con canavalia (sin efecto en el rendimiento del maíz) y, de forma indirecta, un ensayo de Yucatán con otra especie, el frijol terciopelo: sembrarlo el mismo día que el maíz le bajó el rendimiento 59 %, y a los 20 días, 25 %.
  - **Fin de la cobertura.** Se aplica la regla que el Rol 3 ya usa para la canavalia sola: se corta al empezar a florecer, 137 días después de sembrarla (USDA). Se retiró la permanencia «hasta marzo» del prototipo, que contradecía a esa fuente.
- **Diferencia de método con el prototipo.** El prototipo mostraba 17 meses para la intercalada. Ese número salía del calendario anterior (canavalia hasta el 31 de marzo) y de una ventana de enero a diciembre. Con ese mismo calendario, una ventana que empieza en junio da 20. Con las fechas vigentes y la ventana desde junio, da 12. Las tres cifras están en las pruebas como comprobación del método, no en la pantalla.
- **La soya** se conserva como material secundario, debajo de las tres opciones.

### 3. Reglas del cálculo

- **Meses estimados con cultivo en pie.** Ventana de 24 meses desde el mes de la primera siembra del escenario, la misma para los tres planes. Para cada mes se cuenta la unión de días con algún cultivo en pie; dos cultivos asociados el mismo día cuentan una vez. El mes cuenta con 15 días o más (`reglas.cobertura.diasMinimosPorMes`). Es una estimación por calendario: no mide cuánto cubre la planta ni el rastrojo.
- **Exposición histórica.** Se cruza un evento con la etapa sensible (sensibilidad `alta`) de cada cultivo:
  - Evento de agua: racha de 5 días o más con menos de 1 mm. Evento de calor: 3 días o más con 35 °C o más.
  - **Años con coincidencia:** años en que al menos un evento tocó la etapa.
  - **Proporción de días:** promedio, entre los años evaluados, de los días de la etapa dentro de eventos entre los días de la etapa.
  - **Denominador:** solo los años evaluables. Un año se evalúa si todos los años calendario que toca la etapa están completos.
  - Cada cultivo se siembra en su fecha del plan en cada año histórico (la «opción A» del Rol 3).
- **Sin estimación.** Si un cultivo no tiene reglas, no tiene etapa sensible (la canavalia) o no hay años evaluables, el indicador dice «Sin estimación» con el motivo. Nunca se muestra como riesgo cero.
- **Escenario de fechas.** La pantalla deja elegir la fecha de siembra del maíz dentro de la ventana oficial (1 y 15 de junio, 1 y 15 de julio). Todas las fechas se mueven los mismos días y todo se recalcula. Por defecto se usa la fecha que registró el productor.
- **Qué se quitó de la pantalla.** El selector «¿Qué te importa más?», los puntajes ponderados, la etiqueta «Mejor para…» y los indicadores de nitrógeno e ingreso. Los datos solo permiten decir qué escenario tiene más meses con cultivo en pie, y así se etiqueta. `reglas.json` conserva los pesos, pero el motor no los usa.

### 4. Suelo, municipio y zona son datos distintos

- **Suelo.** Se guardan por separado el texto del productor, el nombre local reconocido (`tsekel`, `kankab`) y la clase WRB (`leptosol`, `luvisol`). `zonas.json` y `reglas.json` usan claves WRB; el catálogo `soils.json` las relaciona con los nombres locales. Solo k'ankab y yaax-hom tienen una equivalencia respaldada (Luvisol, INIFAP). La de tsek'el con Leptosol queda como `pendiente_validacion` y no se usa para aplicar reglas de suelo en la comparación.
- **Municipio.** El de la parcela de demo es declarado. Para las demás se toma la cabecera más cercana y se muestra como «cerca de». El punto de la zona Sur queda más cerca de la cabecera de Hopelchén que de la de Tekax, por eso no se deduce.
- **Zona.** Con punto, se asigna la zona del punto de clima más cercano y se guarda la distancia. Solo con municipio, se usa `municipios.json` (`zonaId`); si no hay correspondencia, la parcela queda sin zona, la pantalla dice «cobertura pendiente» y la exposición queda sin estimación.
- **Ámbito agrícola.** `planes.json` declara `ambito.zonas = ["yuc-sur"]`. En las otras dos zonas se publica el clima y la comparación se muestra con un aviso: las fechas y etapas se revisaron para Tekax.

### 5. Datos del servidor en el teléfono

- **Un paquete, no archivos sueltos.** La PWA usa todos los datos del paquete del servidor o todos del respaldo local. No mezcla reglas de una carga con clima de otra.
- **Validación.** Tamaño y SHA-256 de cada documento, forma mínima de cada uno y coherencia entre ellos: cada zona tiene su clima, el clima es de esa zona y de ese punto, y cada cultivo de los planes tiene reglas. Si algo falla, se conserva el último paquete completo.
- **Sin cambios a media sesión.** Si la descarga tarda más de 7 segundos, el paquete nuevo se usa la próxima vez que se abra la app.
- **SHA-256 y contexto seguro.** `crypto.subtle` solo existe en `https` o `localhost`. Si la PWA se abre por `http://IP`, la verificación queda por tamaño y la pantalla lo dice.

### 6. La elección de un plan

- Se guarda en IndexedDB dentro de la parcela (`estrategiaElegida`), con las fechas calculadas y las versiones de los datos. La pantalla confirma «Plan guardado en este dispositivo».
- **No es una siembra.** Elegir un plan no crea temporadas ni siembras y no se encola hacia el servidor. En el calendario aparece como plan, con el fin de la cobertura separado de la cosecha.
- Las contribuciones voluntarias siguen saliendo solo al cerrar una temporada con consentimiento. Queda un pendiente conocido (F3 del contrato): se envía una contribución por siembra, cada una con el resultado general de la temporada.

### 7. Demo sin login

El servidor guarda un perfil ficticio (`demo-productor`) y tres parcelas marcadas como demo, con restricciones en la base que impiden guardar ahí perfiles con credenciales. `GET /api/v1/demo` los publica. No es una cuenta ni un historial real: se mantiene el principio de no exponer parcelas de personas.

## Consecuencias

- `app/src/ui/resultados/opciones-ejemplo.js` se eliminó.
- `planes.json` pasa a formato 0.4 (ciclos con varios cultivos). El formato 0.3 sigue siendo válido.
- La base tiene una migración nueva (`0002_published_content`).
- Los catálogos siguen marcados como de ejemplo: el servidor los publica, pero su contenido es del prototipo.

## Pendientes

1. **Prueba en un teléfono.** Se verificó en Edge sin ventana, con tamaño de pantalla de celular. Los pasos para el teléfono están en `app/README.md`.
2. **Validación en campo** de las fechas de la canavalia intercalada y de la floración de Sac Beh en Tekax.
3. **Equivalencia de tsek'el** y aptitud de los suelos que no están en `reglas.json`.
4. **Resultado por temporada o por cultivo** en las contribuciones (F3).
5. **Zonas restantes** y correspondencia municipio–zona.
6. **Idioma maya** y las demás brechas de `docs/contrato-frontend-backend.md`.
