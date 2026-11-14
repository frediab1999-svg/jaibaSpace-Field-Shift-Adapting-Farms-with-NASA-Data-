# Texto oficial del reto — Field Shift: Adapting Farms with NASA Data

> Copiado de las pestañas *Details* y *Resources* del sitio de NASA Space Apps Challenge 2026 el 2026‑11‑14. El sitio no abre desde algunas máquinas del equipo por un error de certificado HTTPS. Es la referencia oficial del reto; la interpretación vigente del proyecto está en `contexto-general-proyecto.md` y `requisitos-del-sistema.md`.
>
> Enlaces: [Details](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/?tab=details) · [Resources](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/?tab=resources)

## Details

Los agricultores de todo el mundo se enfrentan a cambios de temperatura, patrones de lluvia cambiantes, escasez de agua, fenómenos meteorológicos extremos y deterioro de la salud del suelo. Estas presiones dificultan la elección de rotaciones de cultivos que protejan los campos, conserven el agua y apoyen la resiliencia a largo plazo. Tu reto es crear una herramienta de apoyo a la toma de decisiones que utilice las observaciones terrestres de la NASA junto con información local del suelo, características de los cultivos y prioridades de los agricultores para ayudar a los agricultores a explorar estrategias de rotación que puedan fortalecer la salud del suelo y adaptar sus explotaciones a condiciones cambiantes.

### Antecedentes

Los agricultores se enfrentan a decisiones cada vez más complejas a medida que las temperaturas cambian, las lluvias se vuelven menos predecibles y la salud del suelo empeora en muchas regiones. La escasez de agua, la erosión, el agotamiento de nutrientes y los fenómenos meteorológicos extremos añaden aún más incertidumbre. Seleccionar nuevos cultivos para añadir a una rotación puede ser difícil, porque un cultivo que mejora la salud del suelo en un lugar puede consumir demasiada agua, introducir enfermedades, entrar en conflicto con los mercados locales o quedar fuera de las temporadas de crecimiento previstas en otro lugar.

Este desafío se inspira en parte en la experiencia agrícola multigeneracional: muchas familias han vivido temporadas en las que mejores herramientas para monitorizar las condiciones cambiantes podrían haber ayudado a identificar opciones de rotación más saludables y resilientes. Hoy en día, los conjuntos de datos ambientales a largo plazo de la NASA ofrecen nuevas formas de comprender las condiciones locales de cultivo, y las técnicas de SI abren oportunidades para traducir esos datos en conocimientos prácticos y amigables para los agricultores.

### Objetivos

Podrías considerar combinar las observaciones terrestres de la NASA con información agrícola local para crear una aplicación, modelo, mapa interactivo u otra herramienta de apoyo a la toma de decisiones. El objetivo es ayudar a los agricultores a explorar opciones de rotación de cultivos que puedan mejorar la salud del suelo y fortalecer la resiliencia ante las condiciones cambiantes del tiempo y del agua.

You may explore NASA datasets such as SMAP, ECOSTRESS, GPM, Landsat, MODIS, NASA POWER, GRACE and GRACE‑FO, and SRTM or other NASA elevation products. Using these datasets, you may analyze patterns in temperature, heat stress, rainfall, soil moisture, evaporation, frost risk, extreme precipitation, vegetation stress, and long‑term water trends. You may also consider local soil information, crop characteristics, and farmer priorities—such as water use, forage value, nitrogen‑fixing potential, erosion reduction, organic matter improvement, or market suitability.

Your tool may highlight times when fields are typically bare, seasons when current crops appear more vulnerable, or opportunities for rotations that could interrupt pest cycles, reduce water demand, improve infiltration, or add supplemental income. You may compare at least three rotation strategies, including the existing rotation. For each strategy, you may explain why it was suggested, what evidence supports it, what benefits it may offer, where information gaps exist, and any risks that would need local review by farmers or agricultural experts.

The intended outcome is a supportive tool — one that helps identify patterns and possibilities, but does not replace farmer judgment or local agricultural expertise.

### Potential Considerations

You may (but are not required to) consider the following:

**Understanding Conditions & Data**

- Explore how changes in temperature, soil moisture, rainfall, evaporation, and vegetation stress relate to crop vulnerability and soil health.
- Consider explaining scientific terms such as evapotranspiration, soil moisture anomalies, vegetation indices (e.g., NDVI), frost risk, and water‑balance indicators.
- Clarify how satellite observations differ from ground‑based measurements, and how combining both may improve accuracy.

**SI, Modeling, and Data Fusion**

- You may compare different SI or statistical approaches for identifying patterns in historical climate and soil conditions.
- Consider how SI could highlight seasonal transitions, bare‑field periods, or times when current crops show increased stress.
- Explain how the model interprets uncertainty and where local expertise would be needed to validate results.
- You may consider harmonizing datasets with different spatial and temporal resolutions by downsampling, aggregating, or resampling them to a common analysis grid. Harmonizing resolution can help the SI combine SMAP soil moisture, ECOSTRESS land‑surface temperature, GPM precipitation, Landsat/MODIS vegetation indices, GEDI biomass, and soil datasets into coherent features that support clear, explainable rotation‑strategy comparisons.

**Rotation Strategy Exploration**

- Compara los escenarios de rotación examinando el ciclo de nutrientes, el riesgo de erosión, las contribuciones de materia orgánica, la alteración del ciclo de plagas, el uso de agua, el potencial de forraje o consideraciones de mercado.
- Podrías considerar mapear qué ideas de rotación se alinean mejor con las prioridades del agricultor, como conservar agua, generar ingresos suplementarios o mejorar la estructura del suelo.
- Incluye breves explicaciones sobre cómo los cultivos fijadores de nitrógeno, los cultivos de cobertura, los cultivos de raíces profundas o los cultivos tolerantes a la sequía contribuyen a la salud del suelo a largo plazo.

**Mapeo y visualización geoespacial**

- Considera si los mapas interactivos podrían ayudar a los usuarios a explorar tendencias a lo largo del tiempo, como la humedad a largo plazo del suelo, las olas de calor o la disminución del almacenamiento de agua.
- Explora formas de visualizar vulnerabilidades a nivel de campo (por ejemplo, zonas de riesgo de erosión, puntos críticos de estrés hídrico, zonas propensas a heladas).
- Puedes incluir complementos opcionales como líneas de tiempo, superposiciones que comparen conjuntos de datos o deslizadores de escenarios que ajusten patrones de lluvia o temperatura.

**Diseño centrado en el agricultor**

- Considera cómo hacer que la herramienta sea fácilmente interpretable para agricultores que puedan tener poca experiencia técnica o geoespacial.
- Piensa en formas de permitir que los agricultores introduzcan sus propias prioridades o limitaciones, como la disponibilidad de agua, las limitaciones de equipos o las preferencias de mercado.
- Comparte recordatorios de que la herramienta está pensada para apoyar—no reemplazar—la experiencia local, y destaca dónde el juicio humano es especialmente importante.

Para información y recursos relacionados con este desafío, consulta la pestaña Recursos en la parte superior de la página. Se pueden añadir más recursos antes de que comience el hackatón.

## Resources

> La NASA no respalda a ningún organismo que no sea estadounidense. Entidad gubernamental y no se hace responsable de la información contenida en entidades no estadounidenses. Sitios web gubernamentales. Para los que no son estadounidenses, Sitios web gubernamentales, los participantes deben cumplir con cualquier parámetro de uso de datos de ese sitio web específico.

### Datos y recursos de la NASA

- **Soil Moisture Active Passive (SMAP):** proporciona mediciones globales de la humedad superficial del suelo y del estado de congelación/deshielo, recopiladas cada 2–3 días. La información sobre la humedad del suelo ayuda a identificar el estrés por sequía, la disponibilidad de agua, el potencial de infiltración y las señales tempranas de estrés en el cultivo. Estos datos son valiosos para evaluar cultivos rotativos que podrían mejorar la eficiencia hídrica, las condiciones del suelo o la resiliencia a la sequía.
- **Global Precipitation Measurement (GPM) e IMERG:** la misión GPM y su producto IMERG proporcionan estimaciones globales de tasa de precipitación y acumulación. Estos ayudan a evaluar la fiabilidad de las lluvias, la frecuencia de tormentas extremas, el riesgo de erosión, la entrada de agua a los suelos y las tendencias a largo plazo en la humedad de los campos. IMERG es valioso para comparar estrategias de rotación bajo diferentes escenarios de precipitación. (Las capas de Worldview IMERG pueden descargarse directamente como imágenes de alta resolución.)
- **Landsat y MODIS/VIIRS (reflectancia, NDVI, índices de vegetación):** Landsat (resolución de 30 metros) y MODIS/VIIRS (250–1000 m) proporcionan reflectancia corregida, NDVI, índices de vegetación e indicadores de estrés vegetal, suelo desnudo y cambios estacionales. Estos conjuntos de datos permiten a los participantes mapear el vigor de los cultivos, seguir transiciones estacionales, detectar periodos de alto estrés y comparar visualmente las opciones de rotación.
- **NASA POWER (agroclimatología y datos meteorológicos):** NASA POWER proporciona conjuntos de datos accesibles sobre solar, meteorología y climatología utilizados ampliamente en agricultura. Los conjuntos de datos incluyen temperatura, humedad, radiación e indicadores derivados que ayudan a estimar el uso de agua de los cultivos, las condiciones de la temporada de cultivo, el riesgo de heladas y la idoneidad climática para posibles cultivos de rotación.
- **Shuttle Radar Topography Mission (SRTM), modelos de elevación y terreno:** proporciona datos globales de elevación adecuados para analizar el talud, la escorrentía, el riesgo de erosión, el flujo de agua y las condiciones de estrés impulsadas por el terreno. Los patrones del terreno ayudan a determinar qué cultivos de rotación pueden mejorar la infiltración, reducir la erosión o estabilizar el suelo en las laderas.
- **ECOSTRESS:** mide la temperatura de la superficie terrestre (LST) y la evapotranspiración (ET) a alta resolución espacial. Ayuda a detectar puntos críticos de estrés vegetal, exposición al calor, vulnerabilidad de raíces superficiales y demanda de agua de cultivo. Es especialmente útil para identificar cuándo los cultivos actuales pueden volverse más vulnerables y para mapear diferencias de microclima a nivel de campo.
- **USDA Ag Data Commons:** conjuntos de datos agrícolas de acceso abierto sobre suelos, cultivos, clima, gestión de la tierra, fenología, calidad del agua y condiciones ecológicas. Complementan las observaciones satelitales con información local de cultivos, propiedades de suelos, prácticas de manejo e investigación agrícola a nivel de campo.
- **Web Soil Survey (WSS), USDA NRCS:** datos oficiales de suelos de EE. UU.: mapas detallados, propiedades del suelo, clases de drenaje, riesgo de erosión, grupos hidrológicos e idoneidad para distintos usos; materia orgánica, textura, infiltración y compactación.
- **Cropland Data Layer (CDL), CropScape:** clasificaciones anuales de tierras de cultivo a 30 metros para Estados Unidos (maíz, soya, algodón, trigo, alfalfa y más), para examinar rotaciones existentes, campos desnudos e idoneidad de cultivos.
- **PRISM Climate Data (Oregon State University):** high‑quality climate datasets for the United States, including daily, monthly, and 30‑year climate normals for precipitation, temperature, dewpoint, frost/freeze dates, and more, incorporating topographic effects.
- **USDA NRCS SSURGO/STATSGO2 (soil data):** field‑scale and regional‑scale soil attributes such as texture, organic matter, drainage class, hydrologic soil group, erosion‑risk factors, restrictive layers, and water‑holding capacity.
- **National Agriculture Imagery Program (NAIP):** high‑resolution (typically 1‑meter) aerial imagery captured during the U.S. growing season, to map field boundaries, detect bare soil periods and observe crop development.
- **USGS National Land Cover Database (NLCD):** land‑cover and land‑use classifications at 30‑meter resolution across multiple decades.
- **NLDAS/GLDAS (Land Data Assimilation Systems):** gridded temperature, precipitation, soil moisture, evapotranspiration proxies, radiation and other surface variables at sub‑daily resolution, to study drought onset, moisture deficits and growing‑season transitions. (Search "NLDAS" or "GLDAS" within Earthdata Search.)
- **FAO Global Agro‑Ecological Zones (GAEZ):** global agro‑climatic suitability layers for dozens of crops, along with soil constraints, water availability indicators, yield potentials and land‑productivity assessments, to evaluate whether proposed rotation crops align with local climate and soil conditions.
- **CoCoRaHS:** crowd‑sourced daily precipitation measurements across North America, to validate satellite rainfall estimates such as IMERG.
- **USGS National Water Information System (NWIS):** long‑term records of groundwater levels, streamflow, river stages and water quality.
- **USDA AMS Market News:** commodity prices, demand trends and market conditions, to check whether rotation crops have viable markets.
- **USDA NASS QuickStats:** county‑level and state‑level agricultural statistics (yields, planted acreage, production history, crop frequency).
- **OpenET:** field‑scale evapotranspiration estimates for the western U.S. states.
- **USFS LANDFIRE:** vegetation type and condition, fuel models and landscape characteristics across the United States.
- **Global Ecosystem Dynamics Investigation (GEDI):** laser measurements of canopy height, leaf area index and aboveground biomass (Level 4 biomass products).

### Recursos de agencias espaciales socias (ESA)

- **Copernicus Sentinel‑2:** imágenes multiespectrales de 10–20 metros con alta frecuencia de revisita y bandas para vegetación (red‑edge, NIR, SWIR): NDVI/EVI, suelo desnudo, estrés en cultivos y monitoreo a pequeña escala.
- **ERA5 (reanálisis ECMWF):** variables climáticas horarias globales (temperatura, precipitación, viento, humedad, temperatura del suelo, radiación) para cubrir lagunas donde hay pocas estaciones y analizar tendencias de largo plazo.

## Qué recursos aplican a la Península de Yucatán

| Aplica | Recurso | Uso previsto |
|---|---|---|
| ✅ MVP | NASA POWER → GPM IMERG (`IMERG_PRECTOT`) y MERRA‑2 (`T2M_MAX`) | Rachas secas y episodios de calor por zona |
| ✅ Referencia | FAO GAEZ | Restricciones de suelo y aptitud de cultivos (global; sí cubre la península) |
| 🟡 Extra | SMAP L4, ERA5, Sentinel‑2 / MODIS NDVI, GRACE | Humedad del suelo, respaldo climático, suelo desnudo visto desde satélite, agua subterránea |
| ⚪ Poco valor | SRTM | La península es casi plana; la pendiente casi no explica la erosión |
| ❌ Solo EE. UU. | WSS, SSURGO, CDL, PRISM, NAIP, NLCD, NLDAS, NWIS, OpenET, LANDFIRE, AMS, NASS | Equivalentes en México: INEGI (edafología, uso de suelo), SIAP/DGSIAP (producción y precios), CONAGUA (agua) |
