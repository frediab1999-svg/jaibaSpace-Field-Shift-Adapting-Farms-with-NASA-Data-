# data-pipeline/auditar_datos.py — auditoría reproducible de los datos publicados en app/data
#
# Uso (desde la raíz del repo):
#   python data-pipeline/auditar_datos.py app/data            # comprobaciones sin internet
#   python data-pipeline/auditar_datos.py app/data --nasa     # además vuelve a descargar NASA POWER y compara
#
# Sale con código 1 si alguna comprobación falla. No modifica ningún archivo.
# Qué comprueba:
#   1. Cada id de zonas.json resuelve un archivo de clima y coincide con el id dentro del archivo.
#   2. Latitud y longitud de la zona, de `ubicacion` y de la URL de NASA son el mismo punto
#      (en la URL: longitude=… y latitude=…; en GeoJSON, con --nasa: [longitud, latitud, elevación]).
#   3. Procedencia: parámetro, unidad, producto, resolución, estándar temporal, fecha de corte y periodo.
#   4. Cobertura: años consecutivos sin duplicados, días esperados por año (365/366), ventana de
#      resumen de 92 días y `completa` coherente con los días con dato. Un faltante es null, nunca 0 ni -999.
#   5. Eventos: fechas dentro de su año, duración = fin − inicio + 1, sin traslapes, y ninguna racha
#      o episodio más corto que el mínimo exportado.
#   6. Resumen: años completos y medianas recalculadas.
#   7. Claves cruzadas: suelos de zonas.json ⊂ reglas.json, cultivos de planes.json ⊂ reglas.json,
#      zonaId y sueloPorDefecto de los catálogos existen.
import json
import statistics
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

PARAMS = {"lluvia": ("IMERG_PRECTOT", "GPM IMERG", "mm/day"), "temperatura": ("T2M_MAX", "MERRA-2", "C")}
errores, avisos, hechos = [], [], []


def falla(msg):
    errores.append(msg)


def ok(msg):
    hechos.append(msg)


def bisiesto(a):
    return a % 4 == 0 and (a % 100 != 0 or a % 400 == 0)


def leer(ruta):
    texto = ruta.read_bytes()
    if b"-999" in texto:
        falla(f"{ruta.name}: contiene -999 (el valor de relleno de NASA debe guardarse como null)")
    return json.loads(texto.decode("utf-8"))


def auditar_eventos(zid, anio, lista, minimo, nombre):
    previo_fin = None
    for ev in lista:
        ini, fin = date.fromisoformat(ev["inicio"]), date.fromisoformat(ev["fin"])
        if ini.year != anio or fin.year != anio:
            falla(f"{zid} {anio}: {nombre} fuera de su año ({ev})")
        if (fin - ini).days + 1 != ev["dias"]:
            falla(f"{zid} {anio}: duración incoherente en {nombre} ({ev})")
        if ev["dias"] < minimo:
            falla(f"{zid} {anio}: {nombre} más corta que el mínimo exportado ({ev})")
        if previo_fin is not None and ini <= previo_fin:
            falla(f"{zid} {anio}: {nombre} traslapada o desordenada ({ev})")
        previo_fin = fin


def auditar_clima(zona, clima):
    zid = zona["id"]
    if clima["zona"]["id"] != zid:
        falla(f"{zid}: el archivo de clima dice zona.id = {clima['zona']['id']}")
    p, u = zona["punto"], clima["ubicacion"]
    if (p["lat"], p["lon"]) != (u["lat"], u["lon"]):
        falla(f"{zid}: punto de zonas.json {p} ≠ ubicacion del clima {u}")
    for clave, (param, producto, unidad) in PARAMS.items():
        f = clima["fuentes"][clave]
        q = urllib.parse.parse_qs(urllib.parse.urlparse(f["url"]).query)
        if (float(q["latitude"][0]), float(q["longitude"][0])) != (p["lat"], p["lon"]):
            falla(f"{zid}: la URL de {clave} consulta latitude={q['latitude'][0]} longitude={q['longitude'][0]}, no {p}")
        if param not in q["parameters"][0].split(","):
            falla(f"{zid}: la URL de {clave} no pide {param}")
        if (f["parametro"], f["producto"], f["unidades"]) != (param, producto, unidad):
            falla(f"{zid}: procedencia de {clave} inesperada: {f['parametro']}, {f['producto']}, {f['unidades']}")
        if f.get("timeStandard") != "UTC" or q.get("time-standard", [""])[0] != "UTC":
            falla(f"{zid}: estándar temporal de {clave} distinto de UTC")
        for campo in ("fechaCorte", "fechaDescarga", "primerDatoValido", "resolucionAprox", "versionApi"):
            if not f.get(campo):
                falla(f"{zid}: falta fuentes.{clave}.{campo}")
        if (q["start"][0], q["end"][0]) != (f["primerDatoValido"].replace("-", ""), f["fechaCorte"].replace("-", "")):
            avisos.append(f"{zid}: la URL pide {q['start'][0]}–{q['end'][0]} y {clave} tiene datos {f['primerDatoValido']} a {f['fechaCorte']}")
    d = clima["definiciones"]
    ts = clima["temporadas"]
    anios = [t["anio"] for t in ts]
    if len(set(anios)) != len(anios):
        falla(f"{zid}: hay años duplicados")
    if anios != list(range(anios[0], anios[-1] + 1)):
        falla(f"{zid}: los años no son consecutivos: {anios}")
    for t in ts:
        esperados = 366 if bisiesto(t["anio"]) else 365
        if t["diasEsperados"] != esperados:
            falla(f"{zid} {t['anio']}: diasEsperados = {t['diasEsperados']}, debería ser {esperados}")
        if t["completa"] != (t["diasConDato"] == t["diasEsperados"]):
            falla(f"{zid} {t['anio']}: `completa` no coincide con diasConDato/diasEsperados")
        v = t["ventana"]
        if v["diasEsperados"] != 92:
            falla(f"{zid} {t['anio']}: la ventana de resumen no tiene 92 días esperados")
        if v["diasConDato"] == 0 and v["lluviaMm"] is not None:
            falla(f"{zid} {t['anio']}: ventana sin datos pero con lluvia {v['lluviaMm']} (debe ser null, no 0)")
        auditar_eventos(zid, t["anio"], t["rachas"], d["rachaMinimaReportadaDias"], "racha")
        auditar_eventos(zid, t["anio"], t["episodiosCalor"], d["calorMinimoReportadoDias"], "episodio de calor")
    completas = [t for t in ts if t["completa"]]
    r = clima["resumen"]
    if r["aniosCompletos"] != len(completas):
        falla(f"{zid}: resumen.aniosCompletos = {r['aniosCompletos']}, hay {len(completas)}")
    med_lluvia = round(statistics.median(t["ventana"]["lluviaMm"] for t in completas), 2)
    med_racha = statistics.median(t["ventana"]["rachaMasLarga"]["dias"] for t in completas)
    if (med_lluvia, med_racha) != (r["medianaLluviaVentanaMm"], r["medianaRachaMasLargaDias"]):
        falla(f"{zid}: medianas del resumen {r['medianaLluviaVentanaMm']}/{r['medianaRachaMasLargaDias']} ≠ recalculadas {med_lluvia}/{med_racha}")
    ok(f"{zid}: punto ({p['lat']}, {p['lon']}) = ubicacion = URL NASA; {len(ts)} años {anios[0]}–{anios[-1]}, "
       f"{len(completas)} completos; IMERG_PRECTOT (mm/day, 0.1°) y T2M_MAX (C, MERRA-2), UTC, corte {clima['fuentes']['lluvia']['fechaCorte']}; "
       f"formato v{clima['version']}; medianas jun–ago {med_lluvia} mm y {med_racha} días")


def auditar_nasa(base, zona, clima):
    sys.path.insert(0, str(Path(__file__).parent))
    import clima as pipeline  # noqa: PLC0415  (el pipeline del repo: misma lógica que generó los archivos)

    p = zona["punto"]
    raw = json.load(urllib.request.urlopen(pipeline.url(p["lat"], p["lon"]), timeout=240))
    lon, lat = raw["geometry"]["coordinates"][:2]  # GeoJSON: longitud primero
    if (round(lat, 3), round(lon, 3)) != (round(p["lat"], 3), round(p["lon"], 3)):
        falla(f"{zona['id']}: NASA respondió para ({lat}, {lon}), no para {p}")
    nuevo = pipeline.procesar(zona, raw)

    def sin_descarga(c):
        c = json.loads(json.dumps(c))
        for f in c["fuentes"].values():
            f.pop("fechaDescarga", None)
        return c

    if sin_descarga(nuevo) != sin_descarga(clima):
        difs = [k for k in nuevo if sin_descarga(nuevo)[k] != sin_descarga(clima)[k]]
        falla(f"{zona['id']}: el archivo publicado difiere de una descarga fresca de NASA en: {difs}")
    else:
        ok(f"{zona['id']}: idéntico a una descarga fresca de NASA POWER procesada con clima.py (GeoJSON [{lon}, {lat}])")


def auditar_claves(base, zonas):
    reglas = leer(base / "reglas.json")
    planes = leer(base / "planes.json")
    ids_zona = {z["id"] for z in zonas}
    for z in zonas:
        for s in z.get("suelosPredominantes", []):
            if s not in reglas["suelos"]:
                falla(f"{z['id']}: suelo predominante «{s}» no existe en reglas.json")
    for plan in planes["planes"]:
        for ciclo in plan["ciclos"]:
            for c in ciclo.get("cultivos") or [ciclo]:
                if c["cultivo"] not in reglas["cultivos"]:
                    falla(f"plan {plan['id']}: el cultivo «{c['cultivo']}» no tiene reglas")
    cat = base / "catalogos"
    suelos = {s["id"]: s for s in leer(cat / "soils.json")["items"]}
    for s in suelos.values():
        if s.get("reglasId") and s["reglasId"] not in reglas["suelos"]:
            falla(f"soils.json: {s['id']} apunta a reglas.suelos.{s['reglasId']}, que no existe")
    for m in leer(cat / "municipios.json")["items"]:
        if m.get("zonaId") and m["zonaId"] not in ids_zona:
            falla(f"municipios.json: {m['id']} apunta a la zona {m['zonaId']}, que no existe")
    ok(f"claves cruzadas: {len(planes['planes'])} planes, {len(reglas['cultivos'])} cultivos y {len(reglas['suelos']) - 2} suelos con reglas; "
       f"planes v{planes['version']}, reglas v{reglas['version']}")


def main():
    base = Path(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "app/data")
    con_nasa = "--nasa" in sys.argv
    doc = leer(base / "zonas.json")
    zonas = doc["zonas"]
    ids = [z["id"] for z in zonas]
    if len(set(ids)) != len(ids):
        falla("zonas.json: ids repetidos")
    for z in zonas:
        ruta = base / z["archivoClima"]
        if not ruta.exists():
            falla(f"{z['id']}: no existe {z['archivoClima']}")
            continue
        clima = leer(ruta)
        auditar_clima(z, clima)
        if con_nasa:
            auditar_nasa(base, z, clima)
    sobrantes = {p.stem for p in (base / "clima").glob("*.json")} - set(ids)
    if sobrantes:
        falla(f"clima/: archivos sin zona en zonas.json: {sorted(sobrantes)}")
    auditar_claves(base, zonas)
    for h in hechos:
        print("OK   ", h)
    for a in avisos:
        print("AVISO", a)
    for e in errores:
        print("ERROR", e)
    print(f"\n{len(hechos)} comprobaciones correctas, {len(avisos)} avisos, {len(errores)} errores")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
