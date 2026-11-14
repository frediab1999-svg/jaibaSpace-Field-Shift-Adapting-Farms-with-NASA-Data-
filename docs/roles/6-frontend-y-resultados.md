# Rol 6 — Frontend y resultados

> **Para tu IA:** eres asistente del desarrollador frontend de resultados de jaibaSpace, equipo del NASA Space Apps Challenge 2026 en el reto *Field Shift*. Construye la pantalla que pinta la `salida` de `comparar()` (sección 5 de `docs/contrato-datos.md`). Muestra los dos planes lado a lado, la explicación por criterio, qué dato de la NASA influyó y su fecha de actualización. También prepara el **guion de la demo**, incluido el modo avión. El contexto completo está en `docs/00-contexto-general.md`. El usuario es un productor de Yucatán desde su teléfono, así que usa lenguaje simple y no tecnicismos.

## Entregable del día

> Construye la comparación lado a lado y muestra qué dato de NASA influyó y su fecha de actualización. Prepara el recorrido de la demo, incluyendo el modo avión.

## Empieza ya con datos falsos

Trabaja desde el primer minuto con `app/fixtures/salida-ejemplo.json`, que es la salida del contrato. Cuando el motor esté listo, solo cambias la fuente del objeto.

## La pantalla «Comparar dos planes»

```
┌───────────────────────────────────────────┐
│ Tu prioridad: Disponibilidad de agua      │
│ Recomendado: Rotación                      │
│ «Empatan en sequía; la rotación cubre      │
│  el suelo más meses.»                      │
├────────────────────┬──────────────────────┤
│ PLAN ACTUAL        │ ROTACIÓN             │
│ Maíz de temporal   │ Maíz + cobertura     │
│ [calendario 12 m]  │ [calendario 12 m]    │
│                    │                      │
│ Rachas secas       │ Rachas secas         │
│ 5 de 28 años       │ 5 de 28 años         │
│ = Empate           │ = Empate             │
│                    │                      │
│ Suelo descubierto  │ Suelo descubierto    │
│ 7 meses            │ 3 meses   ✓ mejor    │
├────────────────────┴──────────────────────┤
│ ¿Por qué salió esto?                      │
│  • Razón en lenguaje simple (porQue)      │
│  • Dato NASA: lluvia diaria GPM IMERG,    │
│    1998–2025, actualizado al 31‑dic‑2025  │
│  • Falta confirmar: fecha real de siembra │
├───────────────────────────────────────────┤
│ Comparación histórica, no pronóstico.     │
└───────────────────────────────────────────┘
```

### Elementos obligatorios

1. **Encabezado:** `prioridad`, `comparacion.recomendado` y `comparacion.mensaje`. Si `recomendado === "empate"`, dilo así: «Ambos planes quedan parejos con tu prioridad».
2. **Dos columnas**, una por cada `planes[i]`. En pantallas angostas pasan a tarjetas apiladas o a pestañas «Actual | Rotación».
3. **Calendario de 12 meses por plan**, una barra por ciclo desde `calendario[].siembra` hasta `cosecha`:
   - las `etapasSensibles` se marcan sobre la barra,
   - los meses descubiertos se ven en gris.
4. **Criterio de rachas secas:**
   - `aniosAfectados` de `aniosAnalizados`,
   - `explicacion`,
   - insignia de resultado según `comparacion.rachasSecas`: «Mejor», «Empate» o nada.
   - Si hay empate, **muéstralo como empate**, no como derrota.
5. **Criterio de cobertura:** `mesesDescubierto` con su `explicacion` y la insignia de resultado.
6. **«¿Por qué salió esto?»** debajo de cada plan:
   - `porQue`,
   - **dato de NASA usado** (`datoNasa.descripcion` y `datoNasa.parametro`) con su **fecha de corte** (`datoNasa.fechaCorte` o `fuente.fechaCorte`),
   - el primer elemento de `faltaConfirmar`.
7. **Evidencia (plegable):** «Ver años con rachas secas», una lista de `evidencia` con este formato: «2025: racha de 12 días (6–17 jun), 3 días durante el establecimiento».
8. **Pie:**
   - `fuente.nombre` con enlace a `fuente.url`,
   - `fechaDescarga`,
   - `avisos`,
   - `datosPendientes`,
   - y, si la parcela es de ejemplo, la etiqueta «Dato de ejemplo».

### Reglas de presentación

- **No inventes números.** Todo sale de `salida`.
- Cambia los porcentajes por frecuencias: «5 de cada 28 años» se entiende mejor que «0.18».
- Fechas en español: «31 dic 2025». Usa `toLocaleDateString('es-MX')`.
- No uses solo el color para indicar el ganador. Agrega el texto «Mejor» o un ícono con etiqueta. Mantén un contraste AA.
- Botón «Cambiar prioridad», que vuelve a la pantalla del Rol 5 o recalcula ahí mismo.

### Si sobra tiempo

- Una gráfica pequeña de la racha más larga por año, de 1998 a 2025, a partir de `clima.json → temporadas[].ventana.rachaMasLarga.dias`, con la mediana (7 días) como línea. Destaca 2022 (5 días) y 2025 (12 días).

## Guion de la demo (3–4 minutos)

Prepáralo y ensáyalo con la app **ya instalada** en el teléfono de la demo.

1. **El problema (20 s):** «Un productor de maíz de temporal en Yucatán no sabe si le conviene cambiar su práctica. El total de lluvia engaña.»
2. **Dato NASA (30 s):** «En 2022 y 2025 llovió casi lo mismo de junio a agosto (488 mm frente a 469 mm), pero en 2025 hubo una racha seca de 12 días, más del doble. Dato de GPM IMERG vía NASA POWER.»
3. **Mi parcela (30 s):** abre la app, toca «Cargar parcela de ejemplo» (señala la etiqueta «Dato de ejemplo») y elige la prioridad «Disponibilidad de agua».
4. **Comparar (60 s):** recorre las dos columnas, el empate o ganador en rachas, los meses descubiertos y el recomendado.
5. **¿Por qué? (30 s):** muestra la razón, el dato de NASA con fecha y lo que falta confirmar en campo.
6. **Cambiar prioridad (20 s):** cambia a «Cobertura del suelo» y muestra cómo cambia el peso.
7. **Modo avión (30 s):** activa el modo avión, cierra y vuelve a abrir la app, y repite la comparación: «Funciona en la parcela, sin señal».
8. **Cierre (20 s):** cuenta lo que sigue: más municipios, SMAP, datos reales del productor.

### Lista de verificación antes de la demo

- [ ] La app está instalada en el teléfono y se abrió al menos una vez con conexión, para llenar la caché.
- [ ] El modo avión se probó **antes** de subir al escenario.
- [ ] Brillo al máximo y notificaciones desactivadas.
- [ ] Respaldo: video corto grabado del flujo completo por si falla el teléfono.

## Con quién te coordinas

| Rol | Qué recibes o entregas |
|---|---|
| Rol 4 | La `salida` real. Si falta un campo que necesitas, pídelo y que el líder lo agregue al contrato. |
| Rol 5 | Cómo se navega de «Mi parcela» a resultados y de regreso |
| Rol 2 | Los números para el pitch (2022 vs. 2025, mediana, peores años) |
| Rol 3 | Textos cortos de cada plan en lenguaje de productor |
| Rol 1 | La URL final y la versión desplegada para la demo |

## Criterios de terminado

- [ ] La comparación lado a lado se ve bien en un teléfono de unos 360 px de ancho.
- [ ] Se ven el dato de NASA, el parámetro y la fecha de corte.
- [ ] Los empates se muestran como empate.
- [ ] «Falta confirmar» y «Dato de ejemplo» están visibles.
- [ ] El guion de la demo está ensayado, incluido el modo avión.
