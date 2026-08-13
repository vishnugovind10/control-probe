from __future__ import annotations

import subprocess

from control_probe import quality_gate


def test_quality_gate_accepts_expected_exit_codes(
    monkeypatch,
) -> None:
    calls: list[tuple[str, ...]] = []

    def fake_run(command: tuple[str, ...], check: bool) -> subprocess.CompletedProcess:
        calls.append(command)
        if any(part.endswith("reserve_fail.json") for part in command):
            return subprocess.CompletedProcess(command, 1)
        return subprocess.CompletedProcess(command, 0)

    monkeypatch.setattr(quality_gate.subprocess, "run", fake_run)

    assert quality_gate.main() == 0
    assert calls == [gate.command for gate in quality_gate.GATES]


def test_quality_gate_stops_on_unexpected_failure(monkeypatch) -> None:
    def fake_run(command: tuple[str, ...], check: bool) -> subprocess.CompletedProcess:
        return subprocess.CompletedProcess(command, 2)

    monkeypatch.setattr(quality_gate.subprocess, "run", fake_run)

    assert quality_gate.main() == 2
