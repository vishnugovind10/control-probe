# Institutional Readiness

`control-probe` is intended to be a technical control-verification template for digital asset infrastructure teams. It is ready for institutional evaluation when the checks below are true for a fork or deployment.

## Evidence Package

- The control specification is versioned in `specs/`.
- Fixture data is deterministic and source-attributed outside the repository when it represents non-public data.
- `control-probe run` emits JSON and Markdown reports for each tested control.
- Critical assertion failures return exit code `1`, making the probe suitable for CI/CD policy gates.
- Validation, test, type, packaging, and container checks pass before release.

## Operating Model

- Treat every YAML file as a testable control definition, not as legal policy text.
- Review each metric mapping with engineering and control owners before relying on a result.
- Keep production fixtures out of public repositories.
- Store generated reports in an evidence archive controlled by the institution.
- Run public-chain probes from read-only RPC credentials.

## Release Criteria

Before tagging a release:

```bash
control-probe-quality-gate
python -m build
twine check dist/*
docker build -t control-probe:local .
docker run --rm control-probe:local validate --spec specs/reserve_at_par.yaml
```

## Residual Risk

Passing probes show that supplied implementation data satisfies the written specification at the observed point in time. They do not prove that the specification is complete, legally sufficient, continuously monitored, or calibrated to every historical market condition.
