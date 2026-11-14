# Diagramas de arquitectura y componentes

Estos diagramas se revisaron contra `docs/contrato-datos.md` v0.2, `docs/requisitos-y-modelo.md` y el codigo presente. A la fecha de revision solo esta implementado `data-pipeline/clima.py`; la PWA, el motor JavaScript y los JSON de entrada/salida aun no existen. Las lineas punteadas representan componentes planificados.

## Arquitectura de la aplicacion

<!-- mermaid-checked: no \n, no em-dash/en-dash, no {} in labels, subgraphs are id["label"], arrows are -->|"label"|, all subgraphs closed by end, ids unique -->
~~~mermaid
flowchart TD
    subgraph Existing["Implementado: preparacion historica"]
        Nasa["NASA POWER Daily API"]
        Script["data-pipeline/clima.py"]
        Raw[("data-pipeline/raw por zona")]
        ClimateFiles[("clima por zona JSON")]
        ZoneInput[("zonas.json esperado")]
        ZoneInput -->|"coordenadas y zonas"| Script
        Nasa -->|"IMERG y T2M MAX diarios"| Script
        Script -->|"guarda respuesta original"| Raw
        Script -->|"calcula rachas y calor"| ClimateFiles
    end
    subgraph Planned["Planificado: PWA sin backend"]
        Host["Hosting estatico HTTPS"]
        Installable["PWA instalable"]
        Worker["Service Worker y Cache API"]
        Capture["Captura de parcela y zona"]
        Engine["Motor JavaScript comparar"]
        Results["Ranking de estrategias y evidencia"]
        ParcelStore[("Almacenamiento local de parcela")]
        StaticFiles[("zonas planes reglas municipios JSON")]
        Host -.->|"sirve archivos"| Installable
        Installable -.->|"cachea recursos"| Worker
        Worker -.->|"modo sin conexion"| Capture
        Capture -.->|"entrada contractual"| Engine
        Engine -.->|"resultados historicos"| Results
        Capture -.->|"guarda localmente"| ParcelStore
        StaticFiles -.->|"datos contractuales"| Capture
    end
    ClimateFiles -.->|"publicar y cargar zona elegida"| Engine
~~~

### Resumen tecnologico

| Capa | Tecnologia | Estado | Proposito |
|---|---|---|---|
| Preparacion climatica | Python estandar | Implementado en `data-pipeline/clima.py` | Consultar NASA POWER y producir indicadores por zona |
| Datos climaticos | JSON y archivos crudos | Salida definida; archivos no presentes aun | Conservar historia y respuestas originales por zona |
| NASA | NASA POWER Daily API | Integracion en el script | Descargar GPM IMERG y MERRA-2 T2M_MAX |
| Aplicacion cliente | HTML, CSS y JavaScript | Planificado, sin codigo aun | Captura, motor historico y resultados |
| PWA offline | Manifest, Service Worker y Cache API | Planificado, sin codigo aun | Instalar y cachear aplicacion y JSON |
| Almacenamiento local | localStorage propuesto en Rol 4 | Planificado, sin codigo aun | Persistir los datos de parcela |
| Publicacion | Hosting estatico HTTPS | Propuesto; proveedor no elegido | Servir PWA y archivos JSON |

### Almacenamiento e integraciones

No hay backend de aplicacion ni base de datos. El script existente lee `zonas.json`, consulta NASA POWER por zona, guarda la respuesta original bajo `data-pipeline/raw/` y genera el clima resumido por zona. El contrato v0.2 define ademas `zonas.json`, `planes.json`, `reglas.json`, `municipios.json` y archivos de parcela/resultado, pero esos archivos todavia no estan en el repositorio. La futura PWA consumira esos JSON estaticos y ejecutara la comparacion en el dispositivo. No hay proveedor de pronostico meteorologico en el MVP v0.2.

### Decisiones de arquitectura

- El motor previsto es una funcion pura de JavaScript; Python solo prepara observaciones historicas antes de publicar.
- El contrato v0.2 define siete zonas como meta y al menos una por estado como MVP minimo; la cobertura real depende de los JSON generados.
- El clima representa una zona, no la parcela. Las fuentes y resoluciones de lluvia y temperatura deben mostrarse por separado.
- Los datos se cachearan para que la PWA funcione sin conexion; esta funcionalidad esta especificada, pero aun no implementada.

## Relaciones entre componentes

<!-- mermaid-checked: no \n, no em-dash/en-dash, no {} in labels, subgraphs are id["label"], arrows are -->|"label"|, all subgraphs closed by end, ids unique -->
~~~mermaid
flowchart LR
    subgraph Inputs["Entradas de preparacion"]
        Zones["zonas.json requerido"]
        NasaApi["NASA POWER API"]
    end
    subgraph Pipeline["Script Python implementado"]
        Main["Punto de entrada CLI"]
        UrlFn["url lat lon"]
        SeriesFn["serie por parametro"]
        RunsFn["corridas consecutivas"]
        ProcessFn["procesar zona y respuesta"]
    end
    subgraph Outputs["Salidas del pipeline"]
        RawFiles[("JSON original por zona")]
        ClimateJson[("clima zona JSON v0.2")]
    end
    subgraph FutureApp["PWA planificada"]
        DataLoader["Cargador de JSON"]
        CaptureUi["Captura y asignacion de zona"]
        CompareFn["comparar pura"]
        ResultUi["Ranking y detalle"]
        LocalStore[("Parcela en dispositivo")]
        OfflineCache["Service Worker cache"]
    end

    Zones -->|"configura puntos"| Main
    Main -->|"construye URL por punto"| UrlFn
    UrlFn -->|"consulta diaria"| NasaApi
    NasaApi -->|"respuesta JSON"| Main
    Main -->|"procesa respuesta de zona"| ProcessFn
    ProcessFn -->|"normaliza series"| SeriesFn
    ProcessFn -->|"detecta rachas y episodios"| RunsFn
    Main -->|"persiste respuesta fuente"| RawFiles
    ProcessFn -->|"resume por zona"| ClimateJson
    ClimateJson -.->|"sera publicado"| DataLoader
    DataLoader -.->|"carga datos contractuales"| CompareFn
    CaptureUi -.->|"entrada con zona y suelo"| CompareFn
    CompareFn -.->|"ranking y cinco criterios"| ResultUi
    CaptureUi -.->|"guardar y recuperar"| LocalStore
    OfflineCache -.->|"servir recursos cacheados"| CaptureUi
~~~

### Inventario de componentes

| Componente | Estado | Responsabilidad |
|---|---|---|
| `data-pipeline/clima.py` | Implementado | Lee zonas, solicita datos a NASA POWER, guarda fuente cruda y exporta clima por zona |
| `url(lat, lon)` | Implementado | Forma la consulta NASA POWER para IMERG_PRECTOT y T2M_MAX |
| `serie(raw, param)` | Implementado | Convierte fechas y reemplaza el valor fill por `None` |
| `corridas(dias, cumple, minimo)` | Implementado | Encuentra rachas secas y episodios consecutivos de calor |
| `procesar(zona, raw)` | Implementado | Calcula temporadas, rachas, calor, fuentes y resumen para una zona |
| `zonas.json` | Contrato; no esta presente | Configura zonas y coordenadas que consume el script |
| `clima/<zonaId>.json` | Contrato; no esta generado | Salida historica consumida por motor y UI |
| Cargador y validacion JSON | Planificado | Carga clima de zona, estrategias y reglas |
| Captura y asignacion de zona | Planificado | Obtiene GPS o municipio, selecciona suelo y prioridad |
| `comparar()` JavaScript | Planificado | Calcula cinco criterios y ordena tres o mas estrategias |
| Almacenamiento local | Planificado | Guarda y restaura la parcela en el dispositivo |
| Service Worker | Planificado | Cachea PWA y JSON para uso offline |
| Pantallas de resultados | Planificado | Presenta ranking, explicaciones, fuentes y avisos |

## Diagrama de clases

El diagrama UML conceptual y sus relaciones estan en [clases-field-shift.puml](../../../../../docs/diagramas/clases-field-shift.puml). Refleja el contrato v0.2; no significa que esas clases esten implementadas en codigo.

## Diagrama de casos de uso

Los flujos del productor y del equipo estan en [casos-de-uso-field-shift.puml](../../../../../docs/diagramas/casos-de-uso-field-shift.puml). El pronostico de 7 dias se retiro del contrato v0.2 y no aparece como caso de uso del MVP.
