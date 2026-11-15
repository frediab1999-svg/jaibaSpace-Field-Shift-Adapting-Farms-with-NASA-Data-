# Pipeline de datos

> **Alcance actual:** este pipeline prepara el clima histórico (lluvia y temperatura máxima) de las zonas publicadas. Los escenarios climáticos y otros catálogos siguen pendientes; la arquitectura destino se describe en `../docs/arquitectura-y-estructura.md`.

Esta carpeta contiene el pipeline Python de datos climáticos de jaibaSpace. El script actual procesa el conjunto histórico del MVP inicial. La arquitectura destino y los requisitos de salidas nuevas están descritos en `../docs/arquitectura-y-estructura.md` y `../docs/requisitos-del-sistema.md`.

## Uso

```
python clima.py ../app/data
```

- Lee `../app/data/zonas.json`.
- Para cada zona descarga de NASA POWER la lluvia diaria (GPM IMERG, `IMERG_PRECTOT`) y la temperatura máxima (MERRA‑2, `T2M_MAX`) de 1998 a 2025.
- Guarda la respuesta original en `raw/<zona>.json` y escribe `../app/data/clima/<zona>.json`.
- Solo usa la biblioteca estándar de Python y no necesita clave de API.

Hoy `zonas.json` tiene 3 zonas (`yuc-sur`, `camp-chenes` y `qroo-centro`). Los tres archivos se compararon el 2026‑11‑15 con una descarga fresca de NASA POWER y son idénticos (solo cambia la fecha de descarga).

## Auditoría de los datos publicados

```
python auditar_datos.py ../app/data            # sin internet
python auditar_datos.py ../app/data --nasa     # vuelve a descargar NASA POWER y compara
```

Comprueba que cada zona resuelva su archivo de clima con el mismo id y el mismo punto que consulta a NASA, la procedencia (parámetro, unidad, resolución, estándar temporal y corte), los años y días esperados, que los faltantes sean `null`, la coherencia de los eventos, las medianas del resumen y las claves cruzadas con `planes.json`, `reglas.json` y los catálogos. No modifica archivos y sale con código 1 si algo falla. El detalle está en `../docs/entrega-datos-mvp.md`.

Después de regenerar el clima hay que volver a publicar el paquete en el servidor: `python -m app.seed` (ver `../server/README.md`).

## Límite de responsabilidad

- `clima.py` descarga, normaliza faltantes (`-999` → `null`), calcula rachas secas y episodios de calor y escribe el JSON.
- No compara estrategias: esa lógica pertenece al motor JavaScript del Rol 4.
- Este script solo procesa clima histórico. El servidor carga sus salidas en PostgreSQL con `python -m app.seed` y las publica en `/api/v1/climate/…`; no descarga nada por petición.
- Los umbrales (`UMBRAL_SECO_MM`, `UMBRAL_CALOR_C`) están al inicio del script. Si el Rol 3 los cambia, se actualizan ahí y se regeneran los archivos.
- Los formatos de salida nuevos se definirán en el contrato de API/dominio versionado antes de integrar fuentes de escenarios o catálogos.
