from __future__ import annotations

from pathlib import Path

from typer.testing import CliRunner

from control_probe.cli import app

runner = CliRunner()


def test_cli_validate_accepts_valid_spec() -> None:
    result = runner.invoke(app, ["validate", "--spec", "specs/nav_integrity.yaml"])

    assert result.exit_code == 0
    assert "spec valid" in result.output


def test_cli_run_returns_zero_when_critical_assertions_pass() -> None:
    result = runner.invoke(
        app,
        [
            "run",
            "--spec",
            "specs/reserve_at_par.yaml",
            "--adapter",
            "fixture",
            "--fixture-file",
            "tests/fixtures/reserve_pass.json",
            "--output-dir",
            "reports/test-pass",
        ],
    )

    assert result.exit_code == 0
    assert Path("reports/test-pass/reserve-completeness-001_result.json").exists()


def test_cli_run_returns_one_when_critical_assertion_fails() -> None:
    result = runner.invoke(
        app,
        [
            "run",
            "--spec",
            "specs/reserve_at_par.yaml",
            "--adapter",
            "fixture",
            "--fixture-file",
            "tests/fixtures/reserve_fail.json",
            "--output-dir",
            "reports/test-fail",
        ],
    )

    assert result.exit_code == 1


def test_cli_init_and_report(tmp_path: Path) -> None:
    spec_file = tmp_path / "starter.yaml"
    init_result = runner.invoke(
        app,
        [
            "init",
            "--name",
            "test-control",
            "--type",
            "reserve_at_par",
            "--output",
            str(spec_file),
        ],
    )
    assert init_result.exit_code == 0
    assert spec_file.exists()

    run_result = runner.invoke(
        app,
        [
            "run",
            "--spec",
            "specs/nav_integrity.yaml",
            "--adapter",
            "fixture",
            "--fixture-file",
            "tests/fixtures/nav_stale.json",
            "--export",
            "json",
            "--output-dir",
            str(tmp_path),
        ],
    )
    assert run_result.exit_code == 1

    report_result = runner.invoke(
        app,
        [
            "report",
            "--result-file",
            str(tmp_path / "nav-integrity-001_result.json"),
            "--format",
            "markdown",
        ],
    )
    assert report_result.exit_code == 0
    assert (tmp_path / "nav-integrity-001_result.md").exists()


def test_cli_rejects_invalid_adapter() -> None:
    result = runner.invoke(
        app,
        [
            "run",
            "--spec",
            "specs/reserve_at_par.yaml",
            "--adapter",
            "unknown",
        ],
    )

    assert result.exit_code == 2


def test_cli_report_rejects_invalid_format(tmp_path: Path) -> None:
    run_result = runner.invoke(
        app,
        [
            "run",
            "--spec",
            "specs/reserve_at_par.yaml",
            "--adapter",
            "fixture",
            "--fixture-file",
            "tests/fixtures/reserve_pass.json",
            "--export",
            "json",
            "--output-dir",
            str(tmp_path),
        ],
    )
    assert run_result.exit_code == 0

    report_result = runner.invoke(
        app,
        [
            "report",
            "--result-file",
            str(tmp_path / "reserve-completeness-001_result.json"),
            "--format",
            "html",
        ],
    )

    assert report_result.exit_code == 2


def test_cli_init_rejects_unknown_type(tmp_path: Path) -> None:
    result = runner.invoke(
        app,
        [
            "init",
            "--name",
            "test-control",
            "--type",
            "unknown",
            "--output",
            str(tmp_path / "x.yaml"),
        ],
    )

    assert result.exit_code == 2


def test_cli_run_requires_fixture_file() -> None:
    result = runner.invoke(
        app,
        [
            "run",
            "--spec",
            "specs/reserve_at_par.yaml",
            "--adapter",
            "fixture",
        ],
    )

    assert result.exit_code == 2
