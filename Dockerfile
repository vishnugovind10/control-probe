FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY pyproject.toml README.md LICENSE ./
COPY control_probe ./control_probe
COPY specs ./specs
COPY tests/fixtures ./tests/fixtures

RUN pip install --no-cache-dir .

ENTRYPOINT ["control-probe"]
CMD ["--help"]
