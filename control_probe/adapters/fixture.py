from __future__ import annotations

import json
from pathlib import Path

from control_probe.models import MetricSpec


class AdapterDataError(RuntimeError):
    """Raised when adapter data is missing or malformed."""


class FixtureAdapter:
    name = "fixture"

    def __init__(self, fixture_file: str | Path) -> None:
        try:
            data = json.loads(Path(fixture_file).read_text(encoding="utf-8"))
        except OSError as exc:
            raise AdapterDataError(f"unable to read fixture file: {exc}") from exc
        except json.JSONDecodeError as exc:
            raise AdapterDataError(f"invalid fixture JSON: {exc}") from exc
        if not isinstance(data, dict):
            raise AdapterDataError("fixture root must be a JSON object")
        self.data = data

    def resolve_metric(self, metric: MetricSpec) -> float:
        if metric.id not in self.data:
            raise AdapterDataError(f"fixture missing metric {metric.id!r}")
        value = self.data[metric.id]
        if not isinstance(value, int | float):
            raise AdapterDataError(f"fixture metric {metric.id!r} must be numeric")
        return float(value)
