# Pipeline de datos

Esta carpeta es responsabilidad del Rol 2. Usa Python para descargar y procesar datos de la NASA para cada zona de la Península de Yucatán y exporta el JSON acordado en `docs/contrato-datos.md` (sección 2).

## Uso

```
python clima.py ../app/data
```

- Lee `../app/data/zonas.json`.
- Para cada zona descarga de NASA POWER la lluvia diaria (GPM IMERG, `IMERG_PRECTOT`) y la temperatura máxima (MERRA‑2, `T2M_MAX`) de 1998 a 2025.
- Guarda la respuesta original en `raw/<zona>.json` y escribe `../app/data/clima/<zona>.json`.
- Solo usa la biblioteca estándar de Python y no necesita clave de API.

Verificado el 2026‑11‑14 con las 7 zonas; `yuc-noroeste` reproduce la tabla de referencia de `docs/roles/2-ingenieria-de-datos.md`.

## Límite de responsabilidad

- `clima.py` descarga, normaliza faltantes (`-999` → `null`), calcula rachas secas y episodios de calor y escribe el JSON.
- No compara estrategias: esa lógica pertenece al motor JavaScript del Rol 4.
- No es un servidor de la aplicación. La PWA carga los JSON versionados en `app/data/` y calcula en el teléfono para funcionar sin conexión.
- Los umbrales (`UMBRAL_SECO_MM`, `UMBRAL_CALOR_C`) están al inicio del script. Si el Rol 3 los cambia, se actualizan ahí y se regeneran los archivos.
- Los formatos solo cambian con una nueva versión de `docs/contrato-datos.md`, coordinada por el Rol 1.
