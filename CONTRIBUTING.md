# Contributing

## Development setup

```bash
python -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"
```

On Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

## Quality gates

```bash
ruff check .
black --check .
mypy control_probe
pytest --cov=control_probe
```

## Pull request expectations

- Keep public examples generic and free of confidential data.
- Add or update tests for engine, loader, adapter, or reporter changes.
- Use deterministic fixtures for new control examples.
- Keep adapter interfaces stable where possible.
