# jaibaSpace — Field Shift: Adapting Farms with NASA Data

Participación del equipo jaibaSpace en el **NASA Space Apps Challenge 2026**, reto [*Field Shift: Adapting Farms with NASA Data*](docs/reto-oficial.md).

## Qué hacemos

**Una app para que un productor de temporal de la Península de Yucatán explore estrategias de rotación para su parcela.**

El productor indica dónde está su parcela, qué suelo tiene (*tsek'el*, *k'ankab* o *ak'alche*) y qué quiere priorizar: cuidar el agua, cuidar el suelo, aportar nitrógeno o tener más ingreso. La app compara su práctica actual con tres alternativas (**maíz + cobertura**, **milpa** y **maíz precoz + frijol de relevo**) usando 28 años de lluvia satelital (GPM IMERG) y temperatura (MERRA‑2) de la NASA para su zona. Para cada estrategia explica por qué se sugiere, con qué dato, qué beneficios y riesgos tiene, y qué debe confirmar en campo.

Funciona en el teléfono y **sin conexión**. No predice cosechas y no reemplaza el juicio del productor ni de un técnico: le muestra patrones para que decida mejor.

### Lo que encontramos en los datos

- **El total de lluvia engaña.** En el noroeste de Yucatán, 2022 y 2025 tuvieron casi la misma lluvia de junio a agosto, pero en 2025 la racha seca duró 12 días contra 5.
- **Más lluvia al año no significa menos sequía en verano.** Quintana Roo llueve más que el noroeste de Yucatán, pero tiene las rachas secas de verano más largas de la península.
- **La zona importa.** La parte de los días críticos del maíz que cae en racha seca va de 5 % a 34 % según la zona y el suelo.

Detalle en el [contexto general](docs/00-contexto-general.md#4-la-península-en-datos-verificado-el-20261114).

## Documentación para el equipo

| Documento | Para qué |
|---|---|
| [Texto oficial del reto](docs/reto-oficial.md) | Qué pide la NASA y qué recursos aplican a la península |
| [Contexto general](docs/00-contexto-general.md) | Qué construimos, por qué y con qué datos |
| [Contrato de datos v0.2](docs/contrato-datos.md) | Formatos JSON compartidos y algoritmo del motor |
| [Requisitos y modelo](docs/requisitos-y-modelo.md) | Requisitos verificables y entidades |
| [Guía de trabajo](docs/guia-de-trabajo.md) | Acuerdos del equipo, archivos de cada rol e integración |
| [Roles](docs/roles/) | Qué entrega cada integrante (cada archivo sirve de contexto para su IA) |
| [Arquitectura](.github/modernize/assessment/engines/facts/architecture-diagram.md), [clases](docs/diagramas/clases-field-shift.puml) y [casos de uso](docs/diagramas/casos-de-uso-field-shift.puml) | Diagramas |

## Datos

Los datos de clima se generan con Python, sin dependencias ni clave de API:

```
cd data-pipeline
python clima.py ../app/data
```

Lee `app/data/zonas.json`, descarga NASA POWER para cada zona y escribe `app/data/clima/<zona>.json`. Las respuestas originales quedan en `data-pipeline/raw/`. Los planes y reglas agrícolas (`planes.json`, `reglas.json`) son propuestas del equipo: todo valor sin fuente aparece como «por confirmar» y todo dato inventado lleva `"esEjemplo": true`.

## Ramas

| Rama | Uso |
|---|---|
| `main` | Código final |
| `develop` | Integración de todo el trabajo antes de QA |
| `QA` | Pruebas |
| Ramas de tarea | Cada integrante trabaja en la suya y abre un pull request hacia `develop` |
