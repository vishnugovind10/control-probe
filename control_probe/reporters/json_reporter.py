from __future__ import annotations

import json
from pathlib import Path

from control_probe.models import ProbeResult


def render_json(result: ProbeResult) -> str:
    return result.model_dump_json(indent=2)


def write_json(result: ProbeResult, output_file: str | Path) -> Path:
    path = Path(output_file)
    path.write_text(render_json(result) + "\n", encoding="utf-8")
    return path


def load_result(path: str | Path) -> ProbeResult:
    raw = Path(path).read_text(encoding="utf-8")
    return ProbeResult.model_validate(json.loads(raw))
