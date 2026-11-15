# Pipeline de datos

> **Alcance actual:** este pipeline implementa la preparación climática histórica del MVP v0.2 centrado en maíz. La arquitectura nueva se describe en `../docs/arquitectura-y-estructura.md`; antes de integrar escenarios climáticos o catálogos de semillas, se ampliará el pipeline con fuentes verificadas y salidas versionadas.

Esta carpeta contiene el pipeline Python de datos climáticos de jaibaSpace. El script actual procesa el conjunto histórico del MVP inicial. La arquitectura destino y los requisitos de salidas nuevas están descritos en `../docs/arquitectura-y-estructura.md` y `../docs/requisitos-del-sistema.md`.

## Uso

```
python clima.py ../app/data
```

- Lee `../app/data/zonas.json`.
- Para cada zona descarga de NASA POWER la lluvia diaria (GPM IMERG, `IMERG_PRECTOT`) y la temperatura máxima (MERRA‑2, `T2M_MAX`) de 1998 a 2025.
- Guarda la respuesta original en `raw/<zona>.json` y escribe `../app/data/clima/<zona>.json`.
- Solo usa la biblioteca estándar de Python y no necesita clave de API.

La ejecución histórica se verificó el 2026‑11‑14 con las 7 zonas. Antes de usar estos archivos en la API nueva, se deben validar y publicar con el contrato de datos versionado correspondiente.

## Límite de responsabilidad

- `clima.py` descarga, normaliza faltantes (`-999` → `null`), calcula rachas secas y episodios de calor y escribe el JSON.
- No compara estrategias: esa lógica pertenece al motor JavaScript del Rol 4.
- Este script solo procesa clima histórico. La nueva API FastAPI y la base PostgreSQL/PostGIS son componentes separados; el pipeline se ampliará para publicar conjuntos climáticos y catálogos trazables.
- Los umbrales (`UMBRAL_SECO_MM`, `UMBRAL_CALOR_C`) están al inicio del script. Si el Rol 3 los cambia, se actualizan ahí y se regeneran los archivos.
- Los formatos de salida nuevos se definirán en el contrato de API/dominio versionado antes de integrar fuentes de escenarios o catálogos.
