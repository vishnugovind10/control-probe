from __future__ import annotations

from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console

from control_probe.adapters.evm import AdapterConnectionError, EvmAdapter
from control_probe.adapters.fixture import AdapterDataError, FixtureAdapter
from control_probe.engine import run_probe
from control_probe.loader import SpecValidationError, dump_spec, load_spec
from control_probe.models import ProbeResult, Status
from control_probe.reporters.json_reporter import load_result, write_json
from control_probe.reporters.markdown_reporter import write_markdown

app = typer.Typer(no_args_is_help=True)
console = Console()
err_console = Console(stderr=True)


EnvOption = Annotated[
    list[str] | None,
    typer.Option("--env", help="Template/runtime variable in KEY=VALUE form."),
]


@app.command()
def run(
    spec: Annotated[Path, typer.Option("--spec", exists=True, readable=True)],
    adapter: Annotated[str, typer.Option("--adapter")],
    fixture_file: Annotated[Path | None, typer.Option("--fixture-file")] = None,
    rpc_url: Annotated[str | None, typer.Option("--rpc-url")] = None,
    env: EnvOption = None,
    export: Annotated[str, typer.Option("--export")] = "json,markdown",
    output_dir: Annotated[Path, typer.Option("--output-dir")] = Path("reports"),
) -> None:
    env_map = _parse_env(env)
    try:
        loaded_spec = load_spec(spec, env_map)
        metric_adapter = _build_adapter(adapter, fixture_file, rpc_url, env_map)
        result = run_probe(loaded_spec, metric_adapter)
        _export(result, output_dir, export)
    except SpecValidationError as exc:
        err_console.print(f"[red]Spec validation error:[/red] {exc}")
        raise typer.Exit(2) from exc
    except (AdapterDataError, AdapterConnectionError) as exc:
        err_console.print(f"[red]Adapter error:[/red] {exc}")
        raise typer.Exit(2) from exc

    console.print(f"{result.spec_name}: {result.overall_status.value}")
    if result.overall_status == Status.fail:
        raise typer.Exit(1)


@app.command()
def validate(
    spec: Annotated[Path, typer.Option("--spec", exists=True, readable=True)],
    env: EnvOption = None,
) -> None:
    try:
        load_spec(spec, _parse_env(env))
    except SpecValidationError as exc:
        err_console.print(f"[red]Spec validation error:[/red] {exc}")
        raise typer.Exit(2) from exc
    console.print("spec valid")


@app.command()
def report(
    result_file: Annotated[
        Path,
        typer.Option("--result-file", exists=True, readable=True),
    ],
    format: Annotated[str, typer.Option("--format")] = "markdown",
    output_file: Annotated[Path | None, typer.Option("--output-file")] = None,
) -> None:
    result = load_result(result_file)
    if format == "markdown":
        target = output_file or result_file.with_suffix(".md")
        write_markdown(result, target)
        console.print(str(target))
        return
    if format == "json":
        target = output_file or result_file.with_suffix(".json")
        write_json(result, target)
        console.print(str(target))
        return
    err_console.print("[red]format must be markdown or json[/red]")
    raise typer.Exit(2)


@app.command()
def init(
    name: Annotated[str, typer.Option("--name")],
    type: Annotated[str, typer.Option("--type")],
    output: Annotated[Path, typer.Option("--output")],
) -> None:
    templates = _templates(name)
    if type not in templates:
        err_console.print(f"[red]unknown control type:[/red] {type}")
        raise typer.Exit(2)
    dump_spec(templates[type], output)
    console.print(str(output))


def _build_adapter(
    adapter: str,
    fixture_file: Path | None,
    rpc_url: str | None,
    env: dict[str, str],
) -> FixtureAdapter | EvmAdapter:
    if adapter == "fixture":
        if fixture_file is None:
            raise AdapterDataError("--fixture-file is required for fixture adapter")
        return FixtureAdapter(fixture_file)
    if adapter == "evm":
        if not rpc_url:
            raise AdapterConnectionError("--rpc-url is required for evm adapter")
        return EvmAdapter(rpc_url, env)
    raise AdapterDataError("adapter must be fixture or evm")


def _export(result: ProbeResult, output_dir: Path, export: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    formats = {item.strip() for item in export.split(",") if item.strip()}
    stem = result.spec_id.replace("/", "-")
    if "json" in formats:
        write_json(result, output_dir / f"{stem}_result.json")
    if "markdown" in formats:
        write_markdown(result, output_dir / f"{stem}_report.md")


def _parse_env(items: list[str] | None) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for item in items or []:
        if "=" not in item:
            raise typer.BadParameter("--env values must use KEY=VALUE form")
        key, value = item.split("=", 1)
        parsed[key] = value
    return parsed


def _templates(name: str) -> dict[str, dict[str, object]]:
    return {
        "reserve_at_par": {
            "version": "0.1",
            "control_id": name,
            "name": name.replace("-", " ").title(),
            "description": "Verifies reserve completeness at par under stress.",
            "metrics": [
                {"id": "total_supply", "type": "fixture"},
                {"id": "reserve_balance", "type": "fixture"},
                {"id": "redemption_window", "type": "fixture"},
            ],
            "assertions": [
                {
                    "id": "reserve_covers_supply",
                    "description": "Reserve balance >= total supply at par",
                    "expression": "reserve_balance >= total_supply",
                    "severity": "critical",
                }
            ],
            "stress_scenarios": [
                {"name": "baseline", "description": "No stress", "shocks": {}}
            ],
        },
        "redemption_at_par": {
            "version": "0.1",
            "control_id": name,
            "name": name.replace("-", " ").title(),
            "description": "Verifies redemption settlement at par.",
            "metrics": [
                {"id": "queue_depth", "type": "fixture"},
                {"id": "redemption_rate", "type": "fixture"},
                {"id": "par_value", "type": "fixture"},
                {"id": "settlement_value", "type": "fixture"},
            ],
            "assertions": [
                {
                    "id": "settles_at_par",
                    "description": "Settlement value is at least par",
                    "expression": "settlement_value >= par_value",
                    "severity": "critical",
                }
            ],
            "stress_scenarios": [
                {"name": "baseline", "description": "No stress", "shocks": {}}
            ],
        },
        "nav_integrity": {
            "version": "0.1",
            "control_id": name,
            "name": name.replace("-", " ").title(),
            "description": "Verifies NAV freshness and divergence.",
            "metrics": [
                {"id": "last_nav_timestamp", "type": "fixture"},
                {"id": "current_timestamp", "type": "fixture"},
                {"id": "onchain_nav_per_share", "type": "fixture"},
                {"id": "reference_nav_per_share", "type": "fixture"},
                {"id": "staleness_threshold_seconds", "type": "fixture"},
            ],
            "assertions": [
                {
                    "id": "nav_is_fresh",
                    "description": "NAV age is within threshold",
                    "expression": (
                        "current_timestamp - last_nav_timestamp <= "
                        "staleness_threshold_seconds"
                    ),
                    "severity": "critical",
                }
            ],
            "stress_scenarios": [
                {"name": "baseline", "description": "No stress", "shocks": {}}
            ],
        },
    }


if __name__ == "__main__":
    app()
