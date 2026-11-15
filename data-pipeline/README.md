# Pipeline de datos de jaibaSpace

Pipeline Python para adquirir, normalizar, validar, resumir y exportar datos climáticos reproducibles para la PWA y la API. Se ejecuta fuera del flujo de las personas usuarias.

## Alcance implementado y pendiente

- **Clima histórico:** consultas a NASA POWER Daily para los 11 sitios de demostración documentados en `config/sites.json`, distribuidos en siete zonas. Umán, Hopelchén y Felipe Carrillo Puerto están marcados como referencias del MVP; el comando procesa los 11 sitios si no se filtra.
- **Período y variables:** 2001-01-01 a 2025-12-31, lluvia `IMERG_PRECTOT` y temperaturas diaria máxima/mínima `T2M_MAX` y `T2M_MIN`. Cada variable conserva sus metadatos y resolución propios. Los puntos son referencias locales de las celdas NASA, no mediciones de parcela ni estaciones.
- **Resúmenes:** climatología mensual de acumulados de lluvia y extremos diarios de temperatura; resúmenes anuales de junio a agosto con lluvia total y rachas de al menos 10 días bajo 1 mm/día. El resumen de lluvia se deja como `null` si la ventana tiene días faltantes.
- **Temperatura:** se conserva como contexto descriptivo. No se calculan episodios de calor ni estrés del cultivo hasta definir reglas agronómicas y validarlas con estaciones.
- **Catálogos:** hay un importador de CSV/JSON para registros previamente mapeados a `id` y `name`; no se han elegido adaptadores para fuentes gubernamentales ni una fuente de semillas.
- **Proyecciones:** su ingestión permanece pausada hasta elegir fuente, resolución, escenarios y contrato de datos.
- **Publicación:** los resultados se guardan como JSON versionado por sitio en `exports/`. La carga directa a PostgreSQL espera el contrato de tablas climáticas y de catálogo del servidor. El pipeline no sobrescribe `app/data/clima/`.

El catálogo de sitios y sus coordenadas se mantienen en `config/sites.json`. Sus IDs son slugs locales estables derivados del municipio. Este catálogo no asigna tipos de suelo; cualquier dato edafológico debe incorporarse con fuente y validación de campo documentadas.

## Estructura

```text
config/
  datasets.toml       Fuentes, parámetros, unidades y resoluciones
  pipeline.toml       Rutas y valores de ejecución por defecto
  sites.json          Los 11 puntos de demostración y su zona
sources/              Adaptadores NASA POWER y archivos CSV/JSON locales
raw/                  Respuestas originales por sitio (local, fuera de Git)
normalize/             Formato interno para sitios, clima y catálogos
validate/              Validación de esquema, fechas, cobertura y procedencia
staging/               Conjuntos intermedios normalizados (local, fuera de Git)
aggregate/              Climatología mensual, rachas y distancia entre sitios
workflows/              Orquestación de descarga y de importación de catálogos
publishers/             Exportación JSON atómica y versionada
exports/                Resultados preparados y manifiestos (local)
```

Los esquemas de dominio compartidos deberán residir en `../shared/schemas/`; esa carpeta aún no contiene contratos. El JSON exportado por este pipeline es un formato interno versionado hasta acordar el contrato compartido con el servidor.

## Instalación

Requiere Python 3.12 o 3.13. Desde esta carpeta, crea y activa un entorno virtual e instala el paquete:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
```

La API de NASA POWER no requiere una clave. PostgreSQL no es necesario para descargar, resumir y exportar JSON.

## Uso

Procesar todos los sitios configurados:

```powershell
jaibaspace-pipeline historical
```

Procesar un sitio o todos los sitios asociados a una zona:

```powershell
jaibaspace-pipeline historical --site-id uman-demo
jaibaspace-pipeline historical --zone-id sur-puuc-yuc
```

Se pueden repetir `--site-id` y `--zone-id`. Si se indican ambas opciones, se procesan los sitios que cumplan los dos filtros. También se pueden cambiar el catálogo, la salida o el período:

```powershell
jaibaspace-pipeline historical --sites-file .\config\sites.json --output-dir .\exports --start-date 2001-01-01 --end-date 2025-12-31
```

Para importar un catálogo ya mapeado:

```powershell
jaibaspace-pipeline catalog --name seeds --input .\seeds.json --source "Fuente identificada" --source-updated-at 2026-11-14
```

También se puede reemplazar `jaibaspace-pipeline` por `python clima.py` desde esta carpeta. La importación de catálogos no adapta campos desconocidos de un proveedor; cada adaptador específico debe definirse después de seleccionar y revisar la fuente.

## Flujo y calidad

1. **Adquirir:** guardar la respuesta original NASA por sitio en `raw/` con su versión.
2. **Normalizar:** asociar cada serie con `site_id`, `zone_id`, coordenadas solicitadas y ubicación devuelta por NASA; mantener fechas UTC y representar faltantes como `null`.
3. **Validar:** comprobar coordenadas, los tres parámetros, unidades, fechas diarias, cobertura y procedencia. Un conjunto inválido no se publica.
4. **Agregar:** calcular precipitación mensual solo con meses completos, temperaturas medias diarias con su cobertura reportada y resúmenes de rachas dentro de junio–agosto. Los faltantes interrumpen rachas.
5. **Exportar:** escribir dataset, manifiesto y puntero `latest.json` en `exports/climate/`, con fuente, sitio, zona, período, resolución, versión y fecha de descarga.

Cada sitio se publica de forma atómica después de validarse. Si falla un sitio, conserva su versión anterior; otros sitios que ya se completaron en esa ejecución pueden haber sido publicados.

- Los valores centinela de NASA POWER se convierten a `null`; no se interpretan como cero.
- IMERG (aprox. 0.1°) y MERRA-2 (aprox. 0.5° × 0.625°) conservan metadatos separados.
- Los resúmenes describen historial climático. No son predicciones de cosecha ni recomendaciones agronómicas.
- La distancia al sitio más cercano es solo una referencia; no sustituye límites geográficos de zona ni asignación municipal oficial.
- Los datos de parcela, historial de cosechas y estadísticas colectivas consentidas pertenecen al servidor, no a este pipeline de fuentes climáticas.
