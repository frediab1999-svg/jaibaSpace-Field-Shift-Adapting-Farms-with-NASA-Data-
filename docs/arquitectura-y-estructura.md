# Arquitectura y estructura propuesta

## Decisiones acordadas

- **Producto:** PWA para productores de temporal de la Península de Yucatán.
- **Cultivos:** varios cultivos; maíz y las cuatro estrategias de v0.2 son el caso inicial, no una restricción del producto.
- **Cliente:** PWA en JavaScript con capacidad de uso sin conexión.
- **Servidor:** API en FastAPI para validar solicitudes, sincronizar registros y ofrecer catálogos y estadísticas.
- **Base de datos:** PostgreSQL con PostGIS para consultas geográficas.
- **Acceso del prototipo:** sin login ni cuentas de usuario.
- **Datos de productor:** registros de parcelas y cosechas con consentimiento explícito; estadísticas colectivas consultables por zona.
- **Proyecciones:** escenarios climáticos futuros. No se plantea pronosticar rendimientos en la primera versión.
- **Datos de semillas:** integrar información básica o moderada cuando exista una fuente confiable y utilizable.
- **Cuestionario:** registro breve de siembra y cosecha, con cantidades opcionales y unidades locales.
- **Idioma:** español y maya; textos y audios deben revisarse con hablantes competentes.

Las fuentes concretas para proyecciones y semillas, la retención de datos y el alcance de la traducción todavía requieren definición. El prototipo no implementa autenticación ni recuperación de datos entre dispositivos.

## Principios de arquitectura

1. **Offline primero:** la PWA permite consultar datos previamente descargados y registrar información local aunque no haya conexión.
2. **Sincronización posterior:** las contribuciones autorizadas se envían a la API cuando hay conexión; el historial de uso permanece en el dispositivo.
3. **Sin login en el prototipo:** no hay cuentas ni endpoints para recuperar parcelas individuales desde el servidor. La API recibe solo contribuciones destinadas a agregación, con consentimiento.
4. **Separar dato individual de estadística:** el servidor calcula y publica estadísticas colectivas, sin ofrecer consulta de parcelas o historiales individuales.
5. **Catálogos configurables:** cultivos, variedades, etapas, semillas y estrategias se modelan como datos, no como supuestos fijos del código.
6. **Trazabilidad:** cada conjunto climático o catálogo conserva fuente, fecha, versión y limitaciones.
7. **Escenarios, no certezas:** una proyección climática identifica escenario, periodo y fuente, y no se expresa como rendimiento garantizado.

## Estructura de carpetas

```text
Repositorio/
├── app/                              # PWA JavaScript
│   ├── public/
│   │   ├── icons/
│   │   ├── manifest.webmanifest
│   │   └── sw.js
│   ├── src/
│   │   ├── app/                      # Arranque, rutas y navegación
│   │   ├── modules/
│   │   │   ├── parcel/               # Ubicación y perfil de parcela
│   │   │   ├── crops/                # Catálogo y selección de cultivos
│   │   │   ├── strategies/           # Estrategias y reglas de comparación
│   │   │   ├── harvests/             # Cuestionario e historial
│   │   │   ├── climate/              # Series históricas y escenarios
│   │   │   └── statistics/           # Consulta de resultados agregados
│   │   ├── services/
│   │   │   ├── api/                  # Cliente HTTP de la API
│   │   │   └── sync/                 # Cola y resolución de sincronización
│   │   ├── storage/                  # IndexedDB y caché local
│   │   ├── i18n/                     # Recursos es y maya
│   │   ├── shared/                   # Componentes, utilidades y tipos
│   │   └── main.js
│   └── tests/
├── server/                           # API FastAPI
│   ├── app/
│   │   ├── api/v1/                   # Rutas versionadas
│   │   ├── modules/
│   │   │   ├── parcels/              # Validar contribuciones geográficas
│   │   │   ├── harvests/             # Registros de siembra y cosecha
│   │   │   ├── catalogs/             # Cultivos, variedades y semillas
│   │   │   ├── climate/              # Metadatos y escenarios climáticos
│   │   │   └── statistics/           # Agregación y consulta por zona
│   │   ├── database/                 # Sesiones, repositorios y modelos
│   │   ├── privacy/                  # Consentimiento y reglas de acceso
│   │   └── main.py
│   ├── migrations/                   # Migraciones PostgreSQL/PostGIS
│   └── tests/
├── data-pipeline/                    # Ingesta y preparación reproducible
│   ├── sources/
│   │   ├── nasa/                     # Clima histórico y metadatos
│   │   ├── climate-scenarios/        # Proyecciones climáticas
│   │   ├── government/               # Catálogos públicos disponibles
│   │   └── seeds/                    # Datos de semillas disponibles
│   ├── normalize/                    # Normalización y validación
│   ├── aggregate/                    # Estadística climática y territorial
│   └── exports/                      # Archivos versionados para cliente/API
├── shared/
│   ├── schemas/                      # Contratos JSON/API compartidos
│   └── fixtures/                     # Datos de ejemplo claramente marcados
├── docs/
│   ├── arquitectura-y-estructura.md
│   ├── contexto-general-proyecto.md
│   ├── requisitos-del-sistema.md
│   ├── decisiones/                   # Decisiones de arquitectura versionadas
│   └── ...
├── .env.example                      # Nombres de variables, sin secretos
└── README.md
```

La estructura es una propuesta lógica; no exige crear todos los directorios desde el primer incremento. Cada módulo debe aparecer cuando haya una función concreta que implementar.

## Responsabilidad de cada componente

| Componente | Responsabilidad | Puede operar sin conexión |
|---|---|---|
| PWA | Captura, comparación disponible localmente, consulta de datos descargados y presentación | Sí, con datos previamente sincronizados |
| IndexedDB | Borradores de parcela, historial local, catálogos y cola de cambios | Sí |
| API FastAPI | Recibir contribuciones seudónimas consentidas; servir catálogos, proyecciones y estadísticas colectivas | No; la PWA conserva funciones locales |
| PostgreSQL/PostGIS | Guardar contribuciones para agregación y consultar relaciones espaciales y agregados; no contiene cuentas del prototipo | No |
| Pipeline Python | Descargar, normalizar y versionar clima, escenarios y catálogos | Se ejecuta fuera del flujo del usuario |

## Entidades que deberá contemplar el contrato nuevo

- **Contribución de parcela:** identificador aleatorio de envío, zona o ubicación generalizada, suelo conocido, cultivo y consentimiento. Es seudónima, no es una cuenta ni habilita recuperar un expediente individual.
- **Cultivo y variedad:** catálogo extensible con etapas, calendario y fuentes.
- **Estrategia:** cultivos, secuencia o asociación, objetivo, reglas y limitaciones.
- **Registro de temporada/cosecha:** fechas aproximadas, cultivo, resultado cualitativo, causa y cantidad opcional con unidad local.
- **Conjunto climático:** fuente, resolución, periodo histórico o escenario futuro, versión y fecha de actualización.
- **Estadística agregada:** zona, cultivo, periodo, cantidad de registros usados y método de cálculo.
- **Semilla:** variedad, atributos disponibles, fuente y fecha de vigencia, cuando exista información confiable.
- **Consentimiento:** finalidad autorizada y estado de envío/uso estadístico.

El esquema v0.2 de cuatro estrategias agrícolas para maíz fue retirado como especificación vigente. El nuevo contrato de dominio y API debe definirse y versionarse antes de conectar cliente, servidor y base de datos.

## Cuestionario corto de cosecha

Campos iniciales sugeridos:

1. Cultivo y variedad, si se conoce.
2. Municipio o zona de la parcela.
3. Mes de siembra y mes de cosecha.
4. Resultado: bueno, regular o malo.
5. Causa que el productor asocia al resultado: sequía, exceso de lluvia, plaga, viento u otra.
6. Cantidad cosechada opcional, con unidad local seleccionable.

Los campos desconocidos deben poder omitirse. Una respuesta subjetiva se almacena como tal y no se convierte automáticamente en un rendimiento medido.

## Orden recomendado para construir

1. Definir y versionar el contrato de dominio/API, entidades, permisos y formato de sincronización.
2. Hacer funcionar PWA e IndexedDB con catálogos multicultivo de ejemplo y una cola local demostrable.
3. Crear la API y migraciones para catálogos y registros de cosecha de prueba.
4. Añadir sincronización consentida y estadísticas agregadas con cobertura y cantidad de registros visibles.
5. Incorporar fuentes verificadas para semillas y escenarios climáticos.
6. Añadir español y maya con revisión humana y probar el flujo sin conexión.

La prioridad es entregar incrementos utilizables y explicables. El historial personal permanece local en el prototipo. El usuario puede autorizar una contribución para estadísticas colectivas; estas no deben mostrar grupos tan pequeños que permitan inferir un registro individual. El umbral se define antes de publicar agregados.
