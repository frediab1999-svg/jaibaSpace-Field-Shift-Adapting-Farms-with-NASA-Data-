# 0003. Coherencia de datos y experiencia: no recomendar sin contexto, resumir NASA y aclarar el calendario

- **Estado:** implementada en `feature/ajustes-ux-datos`, para revisión
- **Fecha:** 2026-11-15
- **Punto de partida:** `develop` en `8dd3289`

## Problema

La revisión de la primera versión funcional (decisión 0002) encontró incoherencias:

1. Sin parcela, la app usaba una zona por defecto (`zonas[0]`) y concluía «No por ahora en Sur de Yucatán». Semillas decía además «Usamos el Noroeste de referencia», una zona que ya no existe.
2. El calendario pintaba las rachas y el calor **de 2025** sobre los días del año actual y mostraba nombres de archivos (`reglas.json`).
3. «Sembrar en Milpa del cenote» salía en Semillas porque la parcela de demostración seguía guardada en el teléfono, sin decir que era de ejemplo.
4. Solo se podía elegir una semilla a la vez.
5. El indicador «Temporada de nortes: de noviembre a febrero» era una píldora fija, sin contexto.

## Decisiones

### Sin zona no hay recomendación

- `semillas.js` ya no asume una zona. Sin parcela con zona:
  - no hay semáforo;
  - las tarjetas dicen solo la **época de siembra** del catálogo («Época: jun–jul»);
  - un aviso pide la ubicación («Agregar mi parcela» o «Completar ubicación»).
- `motor/calendario.js` ya no usa `zonaPorDefecto()`. Sin zona, el calendario muestra lo que registró el productor y un aviso para agregar la parcela.
- **Bienvenida:** la primera vez, después del nombre, se explica qué datos hacen falta para recomendar (ubicación, qué siembras, suelo si lo sabes) y se ofrece «Registrar mi parcela», «Primero ver un ejemplo» o «Ahora no».
- **Ventanas sin fuente:** frijol, calabaza y chiles no tienen `source` en `seeds.json`. `viabilidad()` devuelve `fechaSinFuente: true` y la pantalla dice «(por confirmar)».
- **Parcela de ejemplo:** se marca «(ejemplo)» en Semillas, en los botones de sembrar y en la hoja de siembra.

### El clima se resume, no se vuelca

`motor/climaDia.js` (funciones puras, con pruebas) da lo que se muestra en el detalle de cada día:

| Fecha elegida | Lo que se muestra | De dónde sale |
|---|---|---|
| Un día de un año con datos completos (≤ 2025) | Si ese día formaba parte de una racha sin lluvia (y cuál) y si llegó a 35 °C | `rachas` (3+ días con < 1 mm) y `episodiosCalor` (desde 1 día) del archivo de la zona |
| Un día sin datos todavía (2026 en adelante) | En cuántos de los 28 años ese día cayó en una racha seca de 5+ días y en cuántos hizo 35 °C o más, con una frase («la mayoría de los años») | Los mismos archivos, 1998–2025 |

- Un día fuera de una racha **no** se presenta como «llovió», porque el archivo no lo dice.
- El calendario ya no pinta eventos del año pasado sobre las fechas de este año.
- Los puntos de los días son solo lo del productor: siembras, etapas, el plan elegido y las ventanas de lo que tiene sembrado o en el sabucán.
- La leyenda solo muestra los tipos que aparecen en el mes.

### Animación al elegir un día

- Solo se vuelve a dibujar el detalle, no el calendario.
- El contenido anterior se atenúa y una barra recorre el borde superior (≈260 ms). Después el contenido nuevo entra escalonado.
- Con `prefers-reduced-motion` se quita la animación.

### Fuentes legibles y sin archivos

- `fuenteLegible()` (en `shared/format.js`) quita de lo que se muestra los nombres de archivo y los códigos F01/F19. Deja las instituciones y los documentos: INIFAP, FAO, USDA.
- Los datos no cambian; solo cómo se muestran.
- Se quitaron también las menciones a `reglas.json`, `planes.json` y `zonas.json` en los textos de Parcelas, Predicción y Opciones.

### Datos nuevos al volver la conexión

- Al recuperar la red (`online`), `contenido.buscarActualizacion()` descarga y valida el paquete en segundo plano. No lo aplica a media sesión (se mantiene la regla de la decisión 0002).
- El pie del calendario dice de cuándo son los datos. Ofrece «Buscar datos nuevos» y, si llegó un paquete, «Usar datos nuevos», que recarga la app.

### Temporada en el Menú

La píldora se cambió por una tarjeta. La idea es comunicar en qué parte del año estamos, no repetir un rango de meses:

- **Franja de 12 meses** coloreada por temporada (nortes, secas, lluvias), con el mes actual resaltado y «Mes 1 de 4». El color no es la única pista: cada temporada tiene su nombre en la leyenda.
- **Qué sigue:** «Faltan 3 meses. Después: temporada de secas (de marzo a mayo)».
- **Dato de la zona** con parcela: «En Sur de Yucatán, 28 de 28 años tuvieron en noviembre al menos 5 días seguidos sin lluvia (NASA POWER, 1998–2025)».
- Sin parcela, la tarjeta pide la ubicación en lugar de inventar un dato.
- Al tocarla se abre el calendario en ese mes.
- Los límites de las temporadas siguen siendo del catálogo (`listas.json`) y están por confirmar con el Rol 3.

### Voz

- `marcarEscucha()` (en `ui/voz.js`) pone ondas de eco que salen del botón **solo mientras escucha**. En reposo el micrófono ya no pulsa sin parar.
- Se aplica a los micrófonos de Inicio, Menú, buscador de Semillas y observaciones de Información.

## Evaluación de lo que se pidió revisar

### Varias semillas a la vez (punto 4)

**Sí se puede, sin cambiar el backend.**

- El modelo local guarda **una siembra por semilla** dentro de una temporada; una temporada ya aceptaba varias.
- La API recibe **una contribución por cultivo** (`crop_id` en `ContributionCreate`).
- El clima de NASA es **por zona, no por cultivo**: todas las semillas elegidas comparten el mismo clima.
- La exposición por etapa solo se calcula para los cultivos con etapas en las reglas (maíz, canavalia, soya). Para los demás se dice «Sin estimación».

Se implementó así:

- En la hoja de siembra se pueden marcar varias semillas, con superficie opcional para cada una y la misma fecha.
- En Semillas, «Elegir varias» manda la selección al sabucán o la siembra en la parcela (`#/parcelas/:id?sembrar=a,b,c`).

**Limitación conocida (F3, sin cambios):** el resultado de la temporada se envía igual para cada cultivo. Para tener un resultado por cultivo hace falta cambiar el contrato.

### Mi Sabucán (punto 7)

- **Propósito original:** apartar semillas que el productor piensa conseguir o sembrar. Nunca tuvo backend; se guarda en el teléfono (`kv.sabucan`).
- **Antes:** las semillas guardadas sí marcaban en el calendario cuándo abre y cierra su época de siembra, pero la pantalla no lo explicaba y no había forma de pasar de ahí a sembrar.
- **Ahora:**
  - la hoja explica para qué sirve;
  - tiene «Sembrar estas N en <parcela>»;
  - se llena también con la selección múltiple.
- **Pendiente:** sincronizarlo con el servidor, si se quiere conservar entre dispositivos (requiere decidir si es dato personal o estadístico).

### Terreno en Semillas (punto 3)

- Cuando la parcela tiene superficie, Semillas abre en **«Tu terreno»**: el mismo esquema por cuadros de Tus parcelas, con lo sembrado. «Por zona» conserva el mapa de la península con el semáforo.
- Una **foto real o 3D** del terreno queda pendiente. Necesita imágenes satelitales o teselas en línea, que no funcionan sin conexión. También hay que decidir la fuente, por ejemplo Sentinel‑2 o las teselas que ya usa el mapa de captura.
