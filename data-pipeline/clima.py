"""Command-line entry point for jaibaSpace data-pipeline workflows."""

from __future__ import annotations

import argparse
import sys
from dataclasses import replace
from datetime import date
from typing import Sequence

from pipeline_config import load_settings
from pipeline_errors import PipelineError
from workflows.catalogs import run_catalog_import
from workflows.historical_climate import run_historical_climate


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="jaibaspace-pipeline")
    parser.add_argument(
        "--config",
        help="Ruta al TOML principal, relativa a data-pipeline/ si no es absoluta.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    historical = subparsers.add_parser(
        "historical", help="Procesa clima histórico de los sitios configurados con NASA POWER."
    )
    historical.add_argument("--config", dest="command_config")
    historical.add_argument("--sites-file", help="JSON con el catálogo de sitios climáticos.")
    historical.add_argument("--output-dir", help="Carpeta de salida versionada; default: exports/.")
    historical.add_argument(
        "--site-id", action="append", dest="site_ids", help="Procesar un sitio; opción repetible."
    )
    historical.add_argument(
        "--zone-id",
        action="append",
        dest="zone_ids",
        help="Procesar los sitios de una zona; opción repetible.",
    )
    historical.add_argument("--start-date", help="Fecha inicial ISO (YYYY-MM-DD).")
    historical.add_argument("--end-date", help="Fecha final ISO (YYYY-MM-DD).")

    catalog = subparsers.add_parser("catalog", help="Importa un catálogo CSV/JSON mapeado al formato común.")
    catalog.add_argument("--config", dest="command_config")
    catalog.add_argument("--name", required=True, choices=("crops", "varieties", "stages", "seeds"))
    catalog.add_argument("--input", required=True, help="Archivo fuente CSV o JSON.")
    catalog.add_argument("--source", required=True, help="Nombre o URL identificable de la fuente.")
    catalog.add_argument(
        "--source-updated-at",
        required=True,
        help="Fecha de actualización/corte indicada por la fuente (ISO 8601 o YYYY-MM-DD).",
    )

    return parser


def _default_command(arguments: list[str]) -> list[str]:
    """Default option-only invocations to the historical workflow."""
    if not arguments:
        return ["historical"]
    if arguments[0] == "--config":
        if len(arguments) > 2 and arguments[2] in {"historical", "catalog"}:
            return arguments
        return ["historical", *arguments]
    if arguments[0] in {"historical", "catalog", "-h", "--help", "--config"}:
        return arguments
    if arguments[0].startswith("-"):
        return ["historical", *arguments]
    return arguments


def main(argv: Sequence[str] | None = None) -> int:
    arguments = list(sys.argv[1:] if argv is None else argv)
    arguments = _default_command(arguments)
    parser = _parser()
    args = parser.parse_args(arguments)

    try:
        settings = load_settings(args.command_config or args.config)
        if args.command == "historical":
            if args.start_date:
                settings = replace(settings, start_date=date.fromisoformat(args.start_date))
            if args.end_date:
                settings = replace(settings, end_date=date.fromisoformat(args.end_date))
            if settings.start_date > settings.end_date:
                raise ValueError("La fecha inicial debe ser anterior o igual a la fecha final.")
            outputs = run_historical_climate(
                sites_file=args.sites_file,
                exports_dir=args.output_dir,
                site_ids=set(args.site_ids) if args.site_ids else None,
                zone_ids=set(args.zone_ids) if args.zone_ids else None,
                settings=settings,
            )
        elif args.command == "catalog":
            output = run_catalog_import(
                catalog_name=args.name,
                input_file=args.input,
                source=args.source,
                source_updated_at=args.source_updated_at,
                settings=settings,
            )
            outputs = [output]
    except (PipelineError, OSError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2

    for output in outputs:
        print(f"Exportado: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
