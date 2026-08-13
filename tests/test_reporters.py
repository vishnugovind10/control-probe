from __future__ import annotations

from control_probe.adapters.fixture import FixtureAdapter
from control_probe.engine import run_probe
from control_probe.loader import load_spec
from control_probe.models import ProbeResult
from control_probe.reporters.json_reporter import render_json
from control_probe.reporters.markdown_reporter import render_markdown


def test_json_report_round_trips() -> None:
    result = run_probe(
        load_spec("specs/reserve_at_par.yaml"),
        FixtureAdapter("tests/fixtures/reserve_pass.json"),
    )

    rendered = render_json(result)
    parsed = ProbeResult.model_validate_json(rendered)

    assert parsed.spec_id == result.spec_id


def test_markdown_report_contains_scenarios() -> None:
    result = run_probe(
        load_spec("specs/reserve_at_par.yaml"),
        FixtureAdapter("tests/fixtures/reserve_pass.json"),
    )

    rendered = render_markdown(result)

    assert "# Control Probe Report" in rendered
    assert "Scenario: baseline" in rendered
