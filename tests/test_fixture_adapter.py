from __future__ import annotations

from pathlib import Path

import pytest

from control_probe.adapters.fixture import AdapterDataError, FixtureAdapter
from control_probe.models import MetricSpec


def test_fixture_adapter_resolves_metric() -> None:
    adapter = FixtureAdapter("tests/fixtures/reserve_pass.json")

    metric = MetricSpec(id="total_supply", type="fixture")

    assert adapter.resolve_metric(metric) == 10000000.0


def test_fixture_adapter_rejects_missing_metric() -> None:
    adapter = FixtureAdapter("tests/fixtures/reserve_pass.json")

    with pytest.raises(AdapterDataError, match="missing metric"):
        adapter.resolve_metric(MetricSpec(id="unknown", type="fixture"))


def test_fixture_adapter_rejects_non_numeric_metric(tmp_path: Path) -> None:
    fixture = tmp_path / "bad.json"
    fixture.write_text('{"total_supply": "many"}', encoding="utf-8")
    adapter = FixtureAdapter(fixture)

    with pytest.raises(AdapterDataError, match="must be numeric"):
        adapter.resolve_metric(MetricSpec(id="total_supply", type="fixture"))


def test_fixture_adapter_rejects_invalid_json(tmp_path: Path) -> None:
    fixture = tmp_path / "bad.json"
    fixture.write_text("{", encoding="utf-8")

    with pytest.raises(AdapterDataError, match="invalid fixture JSON"):
        FixtureAdapter(fixture)


def test_fixture_adapter_rejects_non_object_json(tmp_path: Path) -> None:
    fixture = tmp_path / "bad.json"
    fixture.write_text("[1, 2, 3]", encoding="utf-8")

    with pytest.raises(AdapterDataError, match="root must be"):
        FixtureAdapter(fixture)
