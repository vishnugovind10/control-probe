from __future__ import annotations

from pathlib import Path

from control_probe.models import ProbeResult, Status

STATUS_MARKERS = {
    Status.pass_: "PASS",
    Status.warn: "WARN",
    Status.fail: "FAIL",
    Status.error: "ERROR",
    "PASS": "PASS",
    "WARN": "WARN",
    "FAIL": "FAIL",
    "ERROR": "ERROR",
}


def render_markdown(result: ProbeResult) -> str:
    lines = [
        "# Control Probe Report",
        "",
        f"**Control:** {result.spec_name}  ",
        f"**Spec ID:** {result.spec_id}  ",
        f"**Adapter:** {result.adapter}  ",
        f"**Timestamp:** {result.timestamp.isoformat()}  ",
        f"**Overall Status:** {_status(result.overall_status)}",
        "",
        "---",
        "",
    ]
    for scenario in result.scenarios:
        lines.extend(
            [
                f"## Scenario: {scenario.name} - {_status(scenario.status)}",
                "",
                "| Assertion | Severity | Status | Expression |",
                "|---|---|---|---|",
            ]
        )
        for assertion in scenario.assertions:
            lines.append(
                "| "
                f"{assertion.description} | {assertion.severity.value} | "
                f"{_status(assertion.status)} | `{assertion.expression}` |"
            )
        failed = [item for item in scenario.assertions if item.status == Status.fail]
        if failed:
            values = failed[0].resolved_values
            value_text = " · ".join(f"{key}={value:g}" for key, value in values.items())
            lines.extend(["", f"**Resolved values:** {value_text}"])
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def write_markdown(result: ProbeResult, output_file: str | Path) -> Path:
    path = Path(output_file)
    path.write_text(render_markdown(result), encoding="utf-8")
    return path


def _status(status: Status | str) -> str:
    return STATUS_MARKERS[status]
