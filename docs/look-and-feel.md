# Look & feel de la PWA Milpa (jaibaSpace)

Guía visual y de interacción del prototipo funcional que vive en `app/`. Cualquier pantalla nueva debe salir de aquí. Los valores exactos están en `app/src/ui/styles/tokens.css`; los componentes, en `components.css` y `pantallas.css`.

## 1. Idea central

La app tiene que sentirse **hecha en la milpa, no en una oficina**. Se usa en el teléfono, a pleno sol y con poca señal. El productor de temporal, el usuario principal, tiene que reconocer su tierra, su lengua y su forma de hablar.

Cuatro principios guían cada decisión:

1. **Orgánico antes que genérico.** Usamos foto real de milpa, bordados, polaroids con cinta, letreros sostenidos a mano y la greca maya. Evitamos degradados de colores aleatorios, íconos de emoji y tarjetas blancas planas.
2. **Evidencia, no promesas.** Ninguna pantalla promete cosechas (ver `contexto-general-proyecto.md`). Mostramos señales con su fuente, su periodo y lo que falta confirmar.
3. **Simple al primer vistazo, profundo al tocar.** La justificación de cada dato se abre solo cuando la persona la pide, como en el acordeón de Predicción.
4. **Funciona sin red.** Cada vista puede pintarse con datos locales. Cuando falta conexión se dice con calma, sin pantallas de error.

## 2. Voz y tono

| Regla | Sí | No |
|---|---|---|
| Hablar de tú, cálido y directo | «¿Cómo le dices a tu parcela?» | «Ingrese el nombre del predio» |
| Usar el nombre que dio la persona | «Te escucho, don Celestino…» | «Usuario» |
| Acentos en maya, siempre junto al español | «Ixi'im, maíz ancestral» | Pantallas solo en maya sin validar |
| Una sola etiqueta en MAYÚSCULAS con tracking por pantalla | `LU'UM` en el encabezado bordado | Varias etiquetas en mayúsculas compitiendo |
| Sin separadores «·» | «2.37 hectáreas, cerca de Umán» | «2.37 ha · Umán» |
| Unidades completas | «hectáreas», «mecates» | «ha» |
| Números reales, no redondos | «En 14 de 28 años…» | «50 %» |
| Rangos e incertidumbre | «Referencia del municipio, no pronóstico» | «Cosecharás 1.2 t» |
| Decir qué falta | «Por confirmar: etapas del frijol (Rol 3)» | Inventar el dato |

Los avisos de error explican qué hacer: «Mueve el mapa hasta tu parcela, usa tu ubicación o elige tu municipio».

## 3. Color

### 3.1 Paleta base (tierra y textil)

| Token | Hex | Uso |
|---|---|---|
| `--guinda` | `#7a2840` | Acento principal sobre crema: avatar, chip de fecha, pin del mapa, botón del micrófono activo |
| `--guinda-2` | `#8f2d56` | Temporada, nodos, textos de acento en el Menú |
| `--pitaya` | `#d81159` | Acción principal (`.btn--primario`), eventos de clima |
| `--dorado` / `--dorado-2` | `#f2cf7a` / `#ffbc42` | Subrayados, etiquetas, flechas de navegación, sabucán |
| `--jade` / `--jade-2` | `#17686e` / `#218380` | Barra del Menú, previsión, compartir |
| `--jade-claro` | `#9fd6db` | Subtítulos de cabeza, datos históricos, foco de campos |
| `--crema` / `--crema-2` | `#f3ead6` / `#fffaf0` | Selección (chips, segmentos), avatar, globos del mapa |
| `--papel` / `--papel-2` | `#f6f0e2` / `#ece3cf` | Calendario, diálogos, sabucán, notas de papel |
| `--tierra` | `#2c2418` | Texto sobre papel y fondo de la etiqueta de voz |
| `--monte` | `#3e4631` | Fondo mientras carga la foto |

### 3.2 Semáforo (letreros de mano)

| Estado | Color | Letrero | Texto |
|---|---|---|---|
| Bien / Sí conviene | `#5d9e4b` | `letrero-bien.webp` (palomita) | «Bien», «Sí conviene» |
| Atención / Espera | `#efc24d` | `letrero-atencion.webp` (!) | «Atención», «Espera», «Regular» |
| Riesgo / No por ahora | `#a8392a` | `letrero-riesgo.webp` (×) | «Riesgo», «No por ahora», «Mal» |
| Sin dato | `#8a8f86` | Sin letrero, sello punteado | «Sin dato» |

El color nunca va solo: siempre lo acompañan un letrero y una palabra.

### 3.3 Calendario de Inicio: color = origen del dato

| Tipo | Color | De dónde sale | Etiqueta de dato |
|---|---|---|---|
| Clima | `#d81159` pitaya | Rachas de 5 o más días sin lluvia (< 1 mm) y episodios de 3 o más días a ≥ 35 °C del último año completo (`app/data/clima/*.json`, NASA POWER, corte 2025-12-31) | Histórico |
| Previsión | `#218380` jade | Fecha de siembra registrada + etapas de `reglas.json`: inicio y fin de la etapa sensible, y cosecha estimada | Actual (tu siembra) |
| Siembra y cosecha | `#e0a020` dorado | Siembras y cosechas registradas con día exacto, y apertura y cierre de la ventana de siembra (catálogo `seeds`) de lo que siembras o tienes en el sabucán | Actual / catálogo |
| Temporada | `#8f2d56` con fondo al 7 % y borde punteado | `listas.json → temporadasDelAnio` más la frecuencia histórica NASA del mes («28 de 28 años…») | Histórico |

### 3.4 Zonas agroclimáticas (`zonas.json`)

| Zona | Color | Nombre corto |
|---|---|---|
| `yuc-noroeste` | `#218380` | Noroeste |
| `qroo-centro` | `#ffbc42` | Zona maya |
| `camp-chenes` | `#8f2d56` | Los Chenes |

### 3.5 Cultivos (surcos del esquema del terreno)

Maíz `#f2b632`, frijol `#6b2f4a`, calabaza `#e47a2e`, chile `#c8202f`, canavalia `#5d9e4b`, soya `#c9a44a`. Vienen del catálogo `crops` (campo `color`).

### 3.6 Contraste

El texto blanco va siempre sobre foto con velo (`.fondo__velo`, `.fondo__arriba`, `.fondo__abajo`) o sobre vidrio oscuro. El texto secundario nunca baja de `rgba(255,255,255,.72)`. Sobre papel se usa `--tierra` (#2c2418) o `--tierra-2` (#4d4234).

## 4. Tipografía

Las fuentes están incluidas en `app/src/assets/fonts` (licencia OFL), así que funcionan sin conexión.

| Familia | Rol | Pesos |
|---|---|---|
| **Plus Jakarta Sans** | Títulos, nombres de parcela, cifras grandes | 700–800, tracking −0.02 a −0.03 em |
| **DM Sans** | Cuerpo, formularios, botones | 400–700 |
| **Caveat** | Solo acentos escritos a mano: frase del encabezado bordado, pies de polaroid, notas y citas del productor | 700 |

Escala usada:

- Título de pantalla: 31 px (`.titulo-grande`).
- Inicio: 34–40 px.
- Cabeza: 23 px.
- Título de tarjeta: 18 px.
- Cuerpo: 15–16 px.
- Ayudas y fuentes: 12.5–13.5 px.
- Interlineado del cuerpo: 1.5.

Caveat nunca se usa en datos ni en botones.

## 5. Materiales y fondos

- **Foto de milpa** (`fondo-milpa.jpg`) de fondo en todas las pantallas. Se mueve lentamente (`respirarFondo`, 26 s) y lleva tres velos: general, superior e inferior.
- **Vidrio oscuro con puntada** (`.tarjeta`):
  - fondo `rgba(22,26,18,.28)` con brillo diagonal;
  - `backdrop-filter: blur(20px) saturate(1.4)`;
  - borde blanco al 26 %;
  - **contorno punteado dorado** a 8 px hacia adentro, que es la puntada del bordado.

  Es la superficie por defecto en Parcelas, Predicción e Información.
- **Vidrio claro** solo en el Menú (`.nodo__circulo`, cabeza crema). Ahí el fondo es la misma foto, muy desenfocada.
- **Papel** (`--papel`) para lo que se lee con calma: calendario, diálogos y sabucán.
- **Polaroid con cinta** (`.polaroid`) para fotos reales, con pie en Caveat y una rotación de ±2°.
- **Nota de papel** (`.nota-papel`) para el consejo «Para platicar con tu técnico».
- **Greca maya** crema bajo la cabeza de cada pantalla, en el Inicio y en el calendario (en terracota).
- **Subrayado dorado a mano** (`subrayado()`) bajo el título principal.
- **Sellos** (`.sello`): pastillas rotadas −2° o +1.5° para estados, por ejemplo «Ejemplo», «Pendiente en el servidor» y «Sí conviene».
- **Letreros de mano** (`letrero-*.webp`) para cualquier juicio bien, atención o riesgo.
- **Parches bordados** (`ico-*.jpg`, `.parche`) para los temas: sol, nube, plaga, semilla y cosecha.
- **Ilustraciones de nodo** (`nodo-*.webp`) en el Menú y en el encabezado bordado (`.hero`) de cada sección.

## 6. Iconografía

- Íconos de trazo propios en `app/src/shared/icons.js`: 24 × 24, trazo de 2–2.4 px, puntas redondas, con `currentColor` cuando se puede.
- Nada de emojis como íconos.
- Los temas agrícolas usan parches bordados, no íconos planos.
- El pin del mapa es guinda con centro dorado y borde crema.

## 7. Componentes

| Componente | Clase / función | Notas |
|---|---|---|
| Cabeza de vidrio | `cabeza()` en `ui/layout.js` | Flecha de regreso, título, subtítulo en jade claro, extra opcional (zona) y greca |
| Barra de Menú | `barraMenu()` | Degradado de jade a tierra, solo en Inicio y Semillas |
| Encabezado bordado | `hero()` | Aro punteado, ilustración, etiqueta en MAYÚSCULAS y frase en Caveat |
| Botones | `.btn--primario`, `--guinda`, `--dorado`, `--jade`, `--vidrio`, `--texto`, `--peligro` | Alto mínimo de 52 px; los chicos, de 44 px |
| Botón redondo | `.btn-oscuro`, `.btn-claro` | 44 × 44 |
| Tarjeta | `.tarjeta`, `.tarjeta--boton` | Vidrio con puntada |
| Campo | `.campo` | 52 px, foco jade claro, `aria-invalid` en rosa |
| Segmentos | `.segmento` | Unidades (m², mecates, hectáreas) y precisión de fecha |
| Chips | `.chip[aria-pressed]` | Selección simple o múltiple; la seleccionada va en crema |
| Opciones grandes | `.opcion` | «Sí, ya se usó» o «No, es nueva» |
| Opciones con letrero | `.opcion-letrero` | «¿Cómo te fue?»: Bien, Regular o Mal |
| Hoja inferior | `abrirHoja()` | Oscura por defecto; `papel: true` para sabucán. Cierra con velo, ✕ o Esc |
| Diálogo | `confirmar()` | Papel; acción peligrosa en guinda |
| Aviso | `avisar()` | Toast dorado de 2.8 s, `role=status` |
| Acordeón | `.acordeon` | Variables de Predicción y registros de Información |
| Tipo de dato | `.dato--historico`, `--actual`, `--ambos`, `--sin` | Siempre visible en cada variable |
| Aviso «Ojo» | `avisoOjo()` | Recuerda que no es pronóstico de cosecha |
| Esquema del terreno | `terreno()` en `ui/componentes/terreno.js` | Tablero inclinado: cada cuadro es 1 mecate, ¼ ha, 1 ha, 5 ha o 10 ha (máx. 48 cuadros); surcos del color del cultivo; suelo según tipo |
| Mapa | `.mapa-pick` + `ui/captura/mapa.js` | Se mueve el mapa y el pin queda fijo; tiene GPS, capa satélite y municipio como respaldo |
| Calendario | `.calendario` en Inicio | Ver 3.3 |
| Franja de 24 meses | `franja24()` en `ui/componentes/franja24.js` | Un mes por celda, del enero del año 1 al diciembre del año 2. Dorado = algún cultivo en pie 15 días o más; tierra rayada = desnuda. No depende solo del color (rayas) y trae texto alternativo con los tramos desnudos. Variante `chica` para el resumen |
| Botón Escuchar | `.btn-escuchar` | Lee en voz alta (síntesis del teléfono, voz local en español si hay). Jade; mientras habla pasa a pitaya con «Detener». Mínimo 44 × 44 |
| Indicador con puntos | `.indicador` + `.puntos3` | Tres puntos de color (rojo, ámbar, verde) además del texto, para leer el nivel sin leer palabras |

## 8. Layout

- **Móvil primero.** El marco mide como máximo 440 px de ancho y 100 dvh de alto. En escritorio se ve como teléfono con la milpa desenfocada detrás (`.escritorio`).
- **Contenido.** Cada pantalla es un `.scroll`: 140 px arriba para la cabeza, 16 px a los lados y 14 px entre bloques.
- **Capas (z-index).** Contenido 1, cabeza 5, flotantes 6 (barra de Menú, micrófono), velo 20, hoja 21, aviso 30.
- **Radios.** Tarjetas de 22–26 px, campos de 16 px, chips de 22 px y hojas de 32 px arriba.
- **Pantallas bajas.** En pantallas de 760 px o menos el bordado del micrófono se reduce al 75 %, y al 60 % en las de 660 px o menos.
- **Ancho mínimo.** Se probó desde 360 × 640.

## 9. Movimiento

Solo se anima lo que da sentido:

- entrada escalonada de bloques (`.entra .d1…d7`, 0.5 s);
- hojas que suben (0.42 s);
- letreros que «se levantan»;
- cuadros del terreno que caen y surcos que crecen;
- aro de señales que se llena;
- halo del micrófono y ondas mientras escucha;
- raíz que crece entre nodos del Menú.

Micro-interacciones de 150 a 300 ms. Las animaciones decorativas de bucle están apagadas. `prefers-reduced-motion` desactiva todo.

## 10. Accesibilidad

- Objetivos táctiles de al menos 44 × 44.
- Foco visible en dorado; el título recibe el foco al cambiar de pantalla.
- `aria-pressed` y `aria-checked` en chips y opciones; `aria-expanded` en acordeones y calendario.
- `role=dialog` y `aria-modal` en hojas y calendario.
- Regiones `aria-live` para la voz, el detalle del día y los resultados de búsqueda.
- Cada campo tiene su `<label>`. Las imágenes decorativas llevan `alt=""` y los letreros, `alt` con su significado.
- `lang="es-MX"`. El micrófono usa la Web Speech API en `es-MX`; si el navegador no la soporta, aparece un campo para escribir.

## 11. Pantallas del happy path

1. **Inicio:**
   - saludo bilingüe con el nombre, y chip de fecha que abre el calendario;
   - greca y «¿Qué quieres hacer hoy?»;
   - tarjeta de la parcela activa, que la cambia;
   - micrófono bordado y etiqueta de voz;
   - barra de Menú.
2. **Menú:** cuatro nodos de vidrio unidos por una raíz (Ixi'im, Lu'um, K'iin y Na'at), con pastilla de la temporada actual y micrófono flotante.
3. **Semillas de temporada:**
   - barra con la parcela activa y la temporada;
   - meses para explorar;
   - maqueta de la península con semáforo por zona;
   - tira de semillas y ficha con razones, fuente y «por confirmar»;
   - botones «Al sabucán» y «Sembrar en…»;
   - buscador abajo y sabucán (pendiente en el servidor).
4. **Tus parcelas:**
   - pestañas Mis parcelas e Historial;
   - formulario con preguntas que cambian según «¿Ya se sembró antes?»;
   - mapa;
   - esquema del terreno;
   - CRUD de semillas;
   - cuestionario de motivo al quitar.
5. **Predicción a futuro:**
   - tarjetas por parcela con sello de nivel;
   - detalle con aro «x de y señales a favor», letrero y frase en Caveat;
   - variables con tipo de dato y justificación al tocar;
   - referencia oficial del municipio, nota para el técnico y aviso «Ojo».
6. **Opciones para tu parcela** («¿Qué siembro el próximo ciclo?»):
   - título, botón «Escuchar las opciones» y la pila que explica por qué se cansa la tierra;
   - chips de prioridad que reordenan las tarjetas;
   - resumen «Tierra desnuda en 2 años» con las cuatro cifras grandes;
   - una tarjeta por opción: sellos («Lo que haces hoy», «Mejor para…», «Empate»), Escuchar, franja de 24 meses, indicadores con puntos, Gana / Cuesta, «¿Por qué?» plegado y «Quiero probar esta»;
   - la opción que no conviene en ese suelo sale plegada con su motivo;
   - nota de papel «La decisión es tuya y de tu técnico» y aviso «Ojo».
7. **Información:**
   - resumen bien / regular / mal y temporadas en curso con «Terminar siembra»;
   - registro de siembras pasadas;
   - línea de tiempo «Predicción contra resultado real», con lo que midió NASA ese año;
   - consentimiento, estado de envíos y estadísticas de la zona;
   - al terminar una siembra, una tarjeta dorada lleva a «¿Qué siembras el próximo ciclo?».

## 12. Recursos gráficos

| Archivo | Origen |
|---|---|
| `fondo-milpa.jpg`, `bordado.webp`, `mapa-peninsula.webp`, `semilla-*.jpg`, `foto-*.jpg`, `ico-*.jpg`, `letrero-*.webp` | Imágenes proporcionadas por el equipo (generadas con Gemini), recortadas y optimizadas para web |
| `nodo-*.webp` | Ilustraciones de nodo proporcionadas por el equipo |
| `icons/icon-*.png` | Derivados del bordado |
| Fuentes | Plus Jakarta Sans, DM Sans y Caveat (SIL OFL 1.1, vía Fontsource) |
| Mapa | Leaflet 1.9.4 (BSD-2) incluido en `src/vendor`. Teselas de © OpenStreetMap y, en «Satélite», © Esri World Imagery. Revisar términos antes de producción |

## 13. Cómo extender sin romper el estilo

- Una pantalla nueva empieza con `fondo()`, `cabeza()` y `.scroll`, y usa `.tarjeta` para agrupar.
- Si hay un juicio (bien, atención o riesgo), lleva letrero. Si hay un dato, lleva su origen (`.dato--*`) y su fuente (`.fuente`).
- Antes de agregar un color, revisa si ya existe un token con ese significado.
- Nada de pantallas en blanco: el estado vacío explica qué hacer y ofrece la acción.
- Las palabras se prueban en voz alta: si suenan a formulario de gobierno, se reescriben.
