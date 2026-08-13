from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class Severity(StrEnum):
    critical = "critical"
    warning = "warning"


class Status(StrEnum):
    pass_ = "PASS"
    warn = "WARN"
    fail = "FAIL"
    error = "ERROR"


MetricType = Literal[
    "erc20_total_supply",
    "erc20_balance",
    "erc20_price",
    "parameter",
    "fixture",
]


class MetricSpec(BaseModel):
    id: str
    type: MetricType
    address: str | None = None
    token: str | None = None
    decimals: int | None = None
    value: Any | None = None

    @field_validator("id")
    @classmethod
    def validate_id(cls, value: str) -> str:
        if not value.replace("_", "").isalnum():
            raise ValueError(
                "metric id must contain only letters, numbers, and underscores"
            )
        return value


class AssertionSpec(BaseModel):
    id: str
    description: str
    expression: str
    severity: Severity


class StressScenario(BaseModel):
    name: str
    description: str
    shocks: dict[str, float] = Field(default_factory=dict)


class ControlSpec(BaseModel):
    version: str
    control_id: str
    name: str
    description: str
    metrics: list[MetricSpec]
    assertions: list[AssertionSpec]
    stress_scenarios: list[StressScenario]

    @model_validator(mode="after")
    def validate_references(self) -> ControlSpec:
        metric_ids = {metric.id for metric in self.metrics}
        if len(metric_ids) != len(self.metrics):
            raise ValueError("metric ids must be unique")
        scenario_names = {scenario.name for scenario in self.stress_scenarios}
        if len(scenario_names) != len(self.stress_scenarios):
            raise ValueError("stress scenario names must be unique")
        for scenario in self.stress_scenarios:
            unknown = set(scenario.shocks) - metric_ids
            if unknown:
                raise ValueError(
                    f"stress scenario {scenario.name!r} references unknown metrics: "
                    f"{', '.join(sorted(unknown))}"
                )
        return self


class AssertionResult(BaseModel):
    id: str
    description: str
    severity: Severity
    status: Status
    expression: str
    resolved_values: dict[str, float]
    error: str | None = None


class ScenarioResult(BaseModel):
    name: str
    status: Status
    assertions: list[AssertionResult]


class ProbeResult(BaseModel):
    spec_id: str
    spec_name: str
    adapter: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    overall_status: Status
    scenarios: list[ScenarioResult]
    baseline_metrics: dict[str, float]
