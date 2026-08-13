.PHONY: install lint format-check type test quality package docker

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
	control-probe-quality-gate

package:
	python -m build
	twine check dist/*

docker:
	docker build -t control-probe:local .
