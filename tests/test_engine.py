from __future__ import annotations

import pytest

from control_probe.adapters.fixture import FixtureAdapter
from control_probe.engine import ExpressionError, evaluate_expression, run_probe
from control_probe.loader import load_spec
from control_probe.models import Status


def test_reserve_pass_fixture_passes_all_critical_assertions() -> None:
    spec = load_spec("specs/reserve_at_par.yaml")
    result = run_probe(spec, FixtureAdapter("tests/fixtures/reserve_pass.json"))

    assert result.overall_status == Status.warn
    assert result.scenarios[0].status == Status.pass_
    assert result.scenarios[-1].status == Status.warn


def test_reserve_fail_fixture_fails_critical_assertion() -> None:
    spec = load_spec("specs/reserve_at_par.yaml")
    result = run_probe(spec, FixtureAdapter("tests/fixtures/reserve_fail.json"))

    assert result.overall_status == Status.fail
    failed = [
        assertion.id
        for scenario in result.scenarios
        for assertion in scenario.assertions
        if assertion.status == Status.fail
    ]
    assert "reserve_covers_supply" in failed


def test_nav_stale_fixture_fails_freshness_assertion() -> None:
    spec = load_spec("specs/nav_integrity.yaml")
    result = run_probe(spec, FixtureAdapter("tests/fixtures/nav_stale.json"))

    assert result.overall_status == Status.fail
    assert result.scenarios[0].assertions[0].id == "nav_is_fresh"
    assert result.scenarios[0].assertions[0].status == Status.fail


def test_expression_evaluator_supports_boolean_and_arithmetic() -> None:
    values = {"a": 10.0, "b": 5.0, "c": 2.0}

    assert evaluate_expression("a / b == c and not b > a", values) is True


def test_expression_evaluator_rejects_calls() -> None:
    with pytest.raises(ExpressionError):
        evaluate_expression("__import__('os').system('echo unsafe')", {})


def test_expression_evaluator_rejects_boolean_arithmetic() -> None:
    with pytest.raises(ExpressionError, match="boolean value"):
        evaluate_expression("(not a) + 1 > 0", {"a": 1.0})


def test_expression_evaluator_requires_boolean_result() -> None:
    with pytest.raises(ExpressionError, match="must evaluate"):
        evaluate_expression("a + 1", {"a": 1.0})


def test_expression_evaluator_supports_chained_comparisons() -> None:
    assert evaluate_expression("a < b < c", {"a": 1.0, "b": 2.0, "c": 3.0})


def test_expression_evaluator_rejects_unsupported_operator() -> None:
    with pytest.raises(ExpressionError, match="unsupported"):
        evaluate_expression("a // 2 == 1", {"a": 2.0})


def test_expression_evaluator_rejects_missing_metric() -> None:
    with pytest.raises(ExpressionError, match="missing metric"):
        evaluate_expression("a > 0", {})
