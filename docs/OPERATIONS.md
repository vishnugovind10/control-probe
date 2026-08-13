# Operations Runbook

## Install

```bash
pip install control-probe
```

For a source checkout:

```bash
pip install -e ".[dev]"
```

## Run a Deterministic Fixture Probe

```bash
control-probe run \
  --spec specs/reserve_at_par.yaml \
  --adapter fixture \
  --fixture-file tests/fixtures/reserve_pass.json \
  --export json,markdown \
  --output-dir reports/reserve-pass
```

## Run an EVM Probe

```bash
control-probe run \
  --spec specs/reserve_at_par.yaml \
  --adapter evm \
  --rpc-url "$RPC_URL" \
  --env TOKEN_ADDRESS=0x0000000000000000000000000000000000000000 \
  --env RESERVE_ADDRESS=0x0000000000000000000000000000000000000000 \
  --env RESERVE_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000 \
  --env REDEMPTION_WINDOW_PCT=0.10
```

Use only read-only RPC credentials. Never pass private keys to `control-probe`.

## Interpret Exit Codes

- `0`: all critical assertions passed.
- `1`: one or more critical assertions failed.
- `2`: spec validation or adapter error.

## Evidence Retention

Archive the generated JSON report as the system-of-record artifact. Markdown reports are review artifacts and can be regenerated from JSON with:

```bash
control-probe report --result-file reports/reserve-completeness-001_result.json --format markdown
```
