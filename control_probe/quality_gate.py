from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class Gate:
    name: str
    command: tuple[str, ...]
    expected_exit_codes: tuple[int, ...] = (0,)


GATES = (
    Gate("ruff", ("ruff", "check", ".")),
    Gate("black", ("black", "--check", ".")),
    Gate("mypy", ("mypy", "control_probe")),
    Gate("pytest", ("pytest", "--cov=control_probe")),
    Gate(
        "reserve pass fixture",
        (
            "control-probe",
            "run",
            "--spec",
            "specs/reserve_at_par.yaml",
            "--adapter",
            "fixture",
            "--fixture-file",
            "tests/fixtures/reserve_pass.json",
            "--output-dir",
            "reports/quality-gate/pass",
        ),
    ),
    Gate(
        "reserve fail fixture",
        (
            "control-probe",
            "run",
            "--spec",
            "specs/reserve_at_par.yaml",
            "--adapter",
            "fixture",
            "--fixture-file",
            "tests/fixtures/reserve_fail.json",
            "--output-dir",
            "reports/quality-gate/fail",
        ),
        expected_exit_codes=(1,),
    ),
    Gate(
        "nav validate",
        ("control-probe", "validate", "--spec", "specs/nav_integrity.yaml"),
    ),
)


def main() -> int:
    for gate in GATES:
        print(f"==> {gate.name}: {' '.join(gate.command)}", flush=True)
        completed = subprocess.run(gate.command, check=False)
        if completed.returncode not in gate.expected_exit_codes:
            print(
                f"{gate.name} failed with exit code {completed.returncode}; "
                f"expected {gate.expected_exit_codes}",
                file=sys.stderr,
            )
            return completed.returncode or 1
    print("all quality gates passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
