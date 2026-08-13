from __future__ import annotations

from pathlib import Path

import pytest

from control_probe.loader import SpecValidationError, load_spec, render_template


def test_loads_valid_spec() -> None:
    spec = load_spec("specs/redemption_at_par.yaml")

    assert spec.control_id == "redemption-at-par-001"
    assert len(spec.metrics) == 4


def test_template_rendering_replaces_known_values() -> None:
    rendered = render_template(
        "address: {{ TOKEN_ADDRESS }}",
        {"TOKEN_ADDRESS": "0xabc"},
    )

    assert rendered == "address: 0xabc"


def test_unknown_metric_reference_is_validation_error(tmp_path: Path) -> None:
    spec_file = tmp_path / "bad.yaml"
    spec_file.write_text(
        """
version: "0.1"
control_id: bad
name: Bad
description: Bad spec
metrics:
  - id: known
    type: fixture
assertions:
  - id: bad_assertion
    description: References missing metric
    expression: "missing >= known"
    severity: critical
stress_scenarios:
  - name: baseline
    description: No stress
    shocks: {}
""",
        encoding="utf-8",
    )

    with pytest.raises(SpecValidationError, match="unknown metric"):
        load_spec(spec_file)


def test_unknown_stress_metric_is_validation_error(tmp_path: Path) -> None:
    spec_file = tmp_path / "bad_shock.yaml"
    spec_file.write_text(
        """
version: "0.1"
control_id: bad
name: Bad
description: Bad spec
metrics:
  - id: known
    type: fixture
assertions:
  - id: ok
    description: OK
    expression: "known >= 0"
    severity: critical
stress_scenarios:
  - name: baseline
    description: Bad shock
    shocks:
      missing: -0.1
""",
        encoding="utf-8",
    )

    with pytest.raises(SpecValidationError, match="unknown metrics"):
        load_spec(spec_file)


def test_invalid_yaml_is_validation_error(tmp_path: Path) -> None:
    spec_file = tmp_path / "invalid.yaml"
    spec_file.write_text("version: [", encoding="utf-8")

    with pytest.raises(SpecValidationError, match="invalid YAML"):
        load_spec(spec_file)


def test_missing_spec_file_is_validation_error(tmp_path: Path) -> None:
    with pytest.raises(SpecValidationError, match="unable to read"):
        load_spec(tmp_path / "missing.yaml")


def test_non_mapping_yaml_is_validation_error(tmp_path: Path) -> None:
    spec_file = tmp_path / "list.yaml"
    spec_file.write_text("- not\n- a\n- mapping\n", encoding="utf-8")

    with pytest.raises(SpecValidationError, match="root must be"):
        load_spec(spec_file)
