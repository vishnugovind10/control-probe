from __future__ import annotations

import ast
import operator
from collections.abc import Mapping
from typing import Protocol

from control_probe.models import (
    AssertionResult,
    ControlSpec,
    MetricSpec,
    ProbeResult,
    ScenarioResult,
    Severity,
    Status,
)


class ExpressionError(ValueError):
    """Raised when an assertion expression is invalid or unsafe."""


class MetricAdapter(Protocol):
    name: str

    def resolve_metric(self, metric: MetricSpec) -> float:
        """Resolve a metric to a numeric value."""


BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
}
CMP_OPS = {
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
}


def validate_expression(expression: str, allowed_names: set[str]) -> None:
    tree = _parse(expression)
    _validate_node(tree, allowed_names)


def evaluate_expression(expression: str, values: Mapping[str, float]) -> bool:
    tree = _parse(expression)
    result = _eval_node(tree.body, values)
    if not isinstance(result, bool):
        raise ExpressionError("expression must evaluate to a boolean")
    return result


def referenced_names(expression: str) -> set[str]:
    tree = _parse(expression)
    return {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}


def run_probe(spec: ControlSpec, adapter: MetricAdapter) -> ProbeResult:
    baseline = {
        metric.id: float(adapter.resolve_metric(metric)) for metric in spec.metrics
    }
    scenarios: list[ScenarioResult] = []

    for scenario in spec.stress_scenarios:
        scenario_values = dict(baseline)
        for metric_id, shock in scenario.shocks.items():
            scenario_values[metric_id] = scenario_values[metric_id] * (1 + shock)

        assertion_results: list[AssertionResult] = []
        for assertion in spec.assertions:
            names = referenced_names(assertion.expression)
            resolved_values = {name: scenario_values[name] for name in sorted(names)}
            try:
                passed = evaluate_expression(assertion.expression, scenario_values)
                status = Status.pass_ if passed else Status.fail
                error = None
            except ExpressionError as exc:
                status = Status.fail
                error = str(exc)
            assertion_results.append(
                AssertionResult(
                    id=assertion.id,
                    description=assertion.description,
                    severity=assertion.severity,
                    status=status,
                    expression=assertion.expression,
                    resolved_values=resolved_values,
                    error=error,
                )
            )

        scenarios.append(
            ScenarioResult(
                name=scenario.name,
                status=_scenario_status(assertion_results),
                assertions=assertion_results,
            )
        )

    return ProbeResult(
        spec_id=spec.control_id,
        spec_name=spec.name,
        adapter=adapter.name,
        overall_status=_overall_status(scenarios),
        scenarios=scenarios,
        baseline_metrics=baseline,
    )


def _parse(expression: str) -> ast.Expression:
    try:
        return ast.parse(expression, mode="eval")
    except SyntaxError as exc:
        raise ExpressionError(f"invalid syntax: {exc.msg}") from exc


def _validate_node(node: ast.AST, allowed_names: set[str]) -> None:
    if isinstance(node, ast.Expression):
        _validate_node(node.body, allowed_names)
        return
    if isinstance(node, ast.BoolOp):
        if not isinstance(node.op, ast.And | ast.Or):
            raise ExpressionError("unsupported boolean operator")
        for value in node.values:
            _validate_node(value, allowed_names)
        return
    if isinstance(node, ast.UnaryOp):
        if not isinstance(node.op, ast.Not | ast.USub | ast.UAdd):
            raise ExpressionError("unsupported unary operator")
        _validate_node(node.operand, allowed_names)
        return
    if isinstance(node, ast.BinOp):
        if type(node.op) not in BIN_OPS:
            raise ExpressionError("unsupported arithmetic operator")
        _validate_node(node.left, allowed_names)
        _validate_node(node.right, allowed_names)
        return
    if isinstance(node, ast.Compare):
        _validate_node(node.left, allowed_names)
        for op in node.ops:
            if type(op) not in CMP_OPS:
                raise ExpressionError("unsupported comparison operator")
        for comparator in node.comparators:
            _validate_node(comparator, allowed_names)
        return
    if isinstance(node, ast.Name):
        if node.id not in allowed_names:
            raise ExpressionError(f"unknown metric {node.id!r}")
        return
    if isinstance(node, ast.Constant) and isinstance(node.value, int | float | bool):
        return
    raise ExpressionError(f"unsupported expression node {type(node).__name__}")


def _eval_node(node: ast.AST, values: Mapping[str, float]) -> float | bool:
    if isinstance(node, ast.Constant) and isinstance(node.value, int | float | bool):
        return node.value
    if isinstance(node, ast.Name):
        if node.id not in values:
            raise ExpressionError(f"missing metric value {node.id!r}")
        return values[node.id]
    if isinstance(node, ast.BinOp):
        op = BIN_OPS.get(type(node.op))
        if op is None:
            raise ExpressionError("unsupported arithmetic operator")
        left = _as_number(_eval_node(node.left, values))
        right = _as_number(_eval_node(node.right, values))
        return op(left, right)
    if isinstance(node, ast.UnaryOp):
        operand = _eval_node(node.operand, values)
        if isinstance(node.op, ast.Not):
            return not bool(operand)
        if isinstance(node.op, ast.USub):
            return -_as_number(operand)
        if isinstance(node.op, ast.UAdd):
            return _as_number(operand)
    if isinstance(node, ast.BoolOp):
        evaluated = [_eval_node(value, values) for value in node.values]
        if isinstance(node.op, ast.And):
            return all(bool(value) for value in evaluated)
        if isinstance(node.op, ast.Or):
            return any(bool(value) for value in evaluated)
    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, values)
        for op_node, comparator in zip(node.ops, node.comparators, strict=True):
            right = _eval_node(comparator, values)
            op = CMP_OPS.get(type(op_node))
            if op is None or not op(left, right):
                return False
            left = right
        return True
    raise ExpressionError(f"unsupported expression node {type(node).__name__}")


def _as_number(value: float | bool) -> float:
    if isinstance(value, bool):
        raise ExpressionError("boolean value cannot be used as a number")
    return float(value)


def _scenario_status(assertions: list[AssertionResult]) -> Status:
    if any(
        result.status == Status.fail and result.severity == Severity.critical
        for result in assertions
    ):
        return Status.fail
    if any(result.status == Status.fail for result in assertions):
        return Status.warn
    return Status.pass_


def _overall_status(scenarios: list[ScenarioResult]) -> Status:
    if any(scenario.status == Status.fail for scenario in scenarios):
        return Status.fail
    if any(scenario.status == Status.warn for scenario in scenarios):
        return Status.warn
    return Status.pass_
