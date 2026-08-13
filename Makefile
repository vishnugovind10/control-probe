.PHONY: install lint format-check type test quality

install:
	pip install -e ".[dev]"

lint:
	ruff check .

format-check:
	black --check .

type:
	mypy control_probe

test:
	pytest --cov=control_probe

quality: lint format-check type test
