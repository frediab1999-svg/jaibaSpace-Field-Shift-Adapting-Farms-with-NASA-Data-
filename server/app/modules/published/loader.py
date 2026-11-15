"""Lee los archivos publicados (app/data y app/fixtures) y arma lo que se carga en la base.

Aquí no hay base de datos: son funciones puras sobre archivos, para poder probarlas y para
que dos cargas seguidas de los mismos archivos den exactamente las mismas huellas.
"""

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

CATALOGS = ("crops", "seeds", "soils", "municipios", "listas")
DEMO_FILE = "fixtures/ejemplo-milpa.json"


class PublishedContentError(ValueError):
    """Los archivos publicados no son coherentes entre sí: no se carga nada."""


@dataclass(frozen=True)
class Document:
    doc_id: str
    kind: str
    format_version: str | None
    body: str
    source_path: str

    @property
    def sha256(self) -> str:
        return hashlib.sha256(self.body.encode("utf-8")).hexdigest()

    @property
    def size_bytes(self) -> int:
        return len(self.body.encode("utf-8"))

    @property
    def data(self) -> dict:
        return json.loads(self.body)


def _read_text(path: Path) -> str:
    """UTF-8 con saltos de línea \\n, para que la huella no dependa de Windows o Linux."""
    return path.read_bytes().decode("utf-8").replace("\r\n", "\n")


def _document(base: Path, relative: str, doc_id: str, kind: str) -> Document:
    path = base / relative
    if not path.is_file():
        raise PublishedContentError(f"No existe el archivo publicado {relative}")
    body = _read_text(path)
    if "-999" in body and kind == "climate":
        raise PublishedContentError(
            f"{relative}: contiene -999; un faltante debe guardarse como null"
        )
    data = json.loads(body)
    return Document(
        doc_id, kind, str(data["version"]) if "version" in data else None, body, relative
    )


def _catalog_document(base: Path, name: str) -> Document:
    """Los catálogos se sirven con la forma {catalog, items, count, …} del contrato de /catalogs."""
    relative = f"data/catalogos/{name}.json"
    source = _document(base, relative, f"catalogos/{name}.json", "catalog")
    data = source.data
    if "items" in data:
        data = {**data, "catalog": name, "count": len(data["items"])}
    else:
        data = {**data, "catalog": name}
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    return Document(source.doc_id, "catalog", source.format_version, body, relative)


def build_documents(published_dir: Path) -> list[Document]:
    """Todos los documentos del paquete, ya validados entre sí."""
    base = Path(published_dir)
    zonas = _document(base, "data/zonas.json", "zonas.json", "zones")
    planes = _document(base, "data/planes.json", "planes.json", "plans")
    reglas = _document(base, "data/reglas.json", "reglas.json", "rules")
    documents = [zonas, planes, reglas]
    documents += [_catalog_document(base, name) for name in CATALOGS]

    zone_ids = set()
    for zona in zonas.data["zonas"]:
        if zona["id"] in zone_ids:
            raise PublishedContentError(f"zonas.json repite el id {zona['id']}")
        zone_ids.add(zona["id"])
        clima = _document(base, f"data/{zona['archivoClima']}", zona["archivoClima"], "climate")
        data = clima.data
        if data["zona"]["id"] != zona["id"]:
            raise PublishedContentError(
                f"{zona['archivoClima']} es de la zona {data['zona']['id']}, no de {zona['id']}"
            )
        punto, ubicacion = zona["punto"], data["ubicacion"]
        if (punto["lat"], punto["lon"]) != (ubicacion["lat"], ubicacion["lon"]):
            raise PublishedContentError(
                f"El clima de {zona['id']} no corresponde al punto de la zona"
            )
        documents.append(clima)

    cultivos = reglas.data["cultivos"]
    for plan in planes.data["planes"]:
        for ciclo in plan["ciclos"]:
            for cultivo in ciclo.get("cultivos") or [ciclo]:
                if cultivo["cultivo"] not in cultivos:
                    raise PublishedContentError(
                        f"El plan {plan['id']} usa {cultivo['cultivo']}, que no está en reglas.json"
                    )
    return documents


def bundle_version(documents: list[Document]) -> str:
    """Huella corta del paquete completo: cambia si cambia cualquier documento."""
    digest = hashlib.sha256()
    for doc in sorted(documents, key=lambda d: d.doc_id):
        digest.update(f"{doc.doc_id}:{doc.sha256}\n".encode())
    return digest.hexdigest()[:12]


def climate_index_row(zona: dict, doc: Document) -> dict:
    """Metadatos del conjunto climático de una zona, tal como están en su archivo."""
    data = doc.data
    lluvia, temperatura = data["fuentes"]["lluvia"], data["fuentes"]["temperatura"]
    temporadas = data["temporadas"]
    return {
        "dataset_id": f"{zona['id']}-historical-nasa-power",
        "zone_id": zona["id"],
        "kind": "historical",
        "source": f"{lluvia['nombre']}: {lluvia['producto']} ({lluvia['parametro']}) y "
        f"{temperatura['producto']} ({temperatura['parametro']})",
        "scenario": None,
        "period_start": temporadas[0]["anio"],
        "period_end": temporadas[-1]["anio"],
        "complete_years": sum(1 for t in temporadas if t["completa"]),
        "resolution": f"lluvia {lluvia['resolucionAprox']}; temperatura {temperatura['resolucionAprox']}",
        "format_version": str(data["version"]),
        "version": f"sha256:{doc.sha256[:12]}",
        "cutoff_date": lluvia["fechaCorte"],
        "time_standard": lluvia["timeStandard"],
        "parameters": {
            "lluvia": {
                k: lluvia[k] for k in ("parametro", "producto", "unidades", "resolucionAprox")
            },
            "temperatura": {
                k: temperatura[k] for k in ("parametro", "producto", "unidades", "resolucionAprox")
            },
            "definiciones": data["definiciones"],
            "url": lluvia["url"],
        },
        "updated_at": lluvia["fechaDescarga"],
        "doc_id": doc.doc_id,
    }


def load_demo(published_dir: Path) -> dict:
    """Perfil y parcelas ficticios de demostración (los mismos que trae la PWA como respaldo)."""
    path = Path(published_dir) / DEMO_FILE
    if not path.is_file():
        raise PublishedContentError(f"No existe {DEMO_FILE}")
    demo = json.loads(_read_text(path))
    if not demo.get("esEjemplo") or not demo.get("perfil", {}).get("esDemo"):
        raise PublishedContentError(
            "El archivo de demo debe estar marcado esEjemplo y perfil.esDemo"
        )
    if demo["perfil"].get("requiereCredenciales"):
        raise PublishedContentError("El perfil de demo no puede requerir credenciales")
    return demo


def demo_parcel_records(demo: dict, parcel_id: str) -> dict:
    """Temporadas, siembras, cosechas e historial de una parcela de demo."""
    temporadas = [t for t in demo["temporadas"] if t["parcelaId"] == parcel_id]
    ids = {t["id"] for t in temporadas}
    return {
        "temporadas": temporadas,
        "siembras": [s for s in demo["siembras"] if s["parcelaId"] == parcel_id],
        "cosechas": {k: v for k, v in demo.get("cosechas", {}).items() if k in ids},
        "historial": [h for h in demo["historial"] if h["parcelaId"] == parcel_id],
    }
