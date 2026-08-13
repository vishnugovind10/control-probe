from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml

from control_probe.engine import ExpressionError, validate_expression
from control_probe.models import ControlSpec


class SpecValidationError(ValueError):
    """Raised when a control specification is invalid."""


ENV_PATTERN = re.compile(r"\{\{\s*([A-Z0-9_]+)\s*\}\}")


def load_spec(path: str | Path, env: dict[str, str] | None = None) -> ControlSpec:
    try:
        raw = Path(path).read_text(encoding="utf-8")
    except OSError as exc:
        raise SpecValidationError(f"unable to read spec file: {exc}") from exc

    rendered = render_template(raw, env or {})
    try:
        data = yaml.safe_load(rendered)
    except yaml.YAMLError as exc:
        raise SpecValidationError(f"invalid YAML: {exc}") from exc

    if not isinstance(data, dict):
        raise SpecValidationError("spec root must be a mapping")

    try:
        spec = ControlSpec.model_validate(data)
    except ValueError as exc:
        raise SpecValidationError(str(exc)) from exc

    validate_spec_expressions(spec)
    return spec


def render_template(raw: str, env: dict[str, str]) -> str:
    def replace(match: re.Match[str]) -> str:
        key = match.group(1)
        return env.get(key, match.group(0))

    return ENV_PATTERN.sub(replace, raw)


def validate_spec_expressions(spec: ControlSpec) -> None:
    metric_ids = {metric.id for metric in spec.metrics}
    for assertion in spec.assertions:
        try:
            validate_expression(assertion.expression, metric_ids)
        except ExpressionError as exc:
            raise SpecValidationError(
                f"invalid expression for assertion {assertion.id!r}: {exc}"
            ) from exc


def dump_spec(data: dict[str, Any], path: str | Path) -> None:
    Path(path).write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
