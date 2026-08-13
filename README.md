# control-probe

Verify that digital asset control specifications hold under stress, not just under normal conditions.

[![CI](https://github.com/vishnugovind10/control-probe/actions/workflows/ci.yml/badge.svg)](https://github.com/vishnugovind10/control-probe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## The problem

Regulated financial institutions deploying tokenized funds, stablecoins, and settlement systems often maintain controls in policy documents while the actual enforcement lives in contracts, custody systems, ledger logic, or operational runbooks. That creates a verification gap: the written control and the implemented state can drift.

`control-probe` closes that gap for technical controls. It reads a structured YAML control specification, resolves implementation data from a fixture or EVM source, applies stress scenarios, evaluates assertions, and emits JSON plus Markdown evidence reports that can be used in engineering review, control testing, and CI.

## Quick start

```bash
pip install git+https://github.com/vishnugovind10/control-probe.git
control-probe run --spec specs/reserve_at_par.yaml --adapter fixture --fixture-file tests/fixtures/reserve_pass.json
```

## What it checks

| Control type | What it verifies | Example assertion |
|---|---|---|
| Reserve at par | Reserve assets cover outstanding token supply under redemption stress | `reserve_balance >= total_supply` |
| Redemption at par | Redemptions settle at or above par and drain within target windows | `settlement_value >= par_value` |
| NAV integrity | NAV data is fresh and within a reference tolerance | `current_timestamp - last_nav_timestamp <= staleness_threshold_seconds` |
| Settlement finality | Template starter for implementation-specific finality checks | Custom spec |
| Collateral adequacy | Template starter for collateral coverage checks | Custom spec |

## Control specification format

```yaml
version: "0.1"
control_id: "reserve-completeness-001"
name: "Reserve Completeness Under Redemption Stress"
description: "Verifies reserve coverage under stress."
metrics:
  - id: total_supply
    type: erc20_total_supply
    address: "{{ TOKEN_ADDRESS }}"
    decimals: 6
  - id: reserve_balance
    type: erc20_balance
    address: "{{ RESERVE_ADDRESS }}"
    token: "{{ RESERVE_TOKEN_ADDRESS }}"
    decimals: 6
assertions:
  - id: reserve_covers_supply
    description: "Reserve balance >= total supply at par"
    expression: "reserve_balance >= total_supply"
    severity: critical
stress_scenarios:
  - name: baseline
    description: No stress
    shocks: {}
```

## CLI reference

```bash
control-probe run --spec specs/reserve_at_par.yaml --adapter fixture --fixture-file tests/fixtures/reserve_pass.json --export json,markdown --output-dir reports
control-probe validate --spec specs/reserve_at_par.yaml
control-probe report --result-file reports/reserve-completeness-001_result.json --format markdown
control-probe init --name test-control --type reserve_at_par --output test.yaml
```

Exit codes:

- `0`: all critical assertions pass across all stress scenarios
- `1`: one or more critical assertions fail
- `2`: spec validation error or adapter error

## Writing a control spec

1. Define metrics that map the written control to measurable state.
2. Write boolean assertions against those metric IDs.
3. Add stress scenarios as multiplicative shocks to baseline metric values.
4. Run with the fixture adapter first for deterministic review.
5. Move to the EVM adapter when the data source is stable and public.

## Adapters

`fixture` reads deterministic JSON values by metric ID. Use it for offline testing, CI, demonstrations, and controls that require off-chain data.

`evm` reads public EVM state through Web3.py. It currently supports ERC-20 `totalSupply`, ERC-20 `balanceOf`, and literal parameters. Price adapters and Multicall3 batching are roadmap items.

## Deployable Paths

Source checkout:

```bash
pip install -e ".[dev]"
control-probe-quality-gate
python -m build
twine check dist/*
```

Container:

```bash
docker build -t control-probe:local .
docker run --rm control-probe:local validate --spec specs/reserve_at_par.yaml
```

Web UI:

```bash
cd web
npm install
npm run build
```

Deploy the web UI from `web/` as a Vite project. The demonstration flow is:
open the deployed URL, click `Run`, and confirm the baseline row passes while
the `-30% reserve stress` row fails.

Institutional operators should start with [docs/INSTITUTIONAL_READINESS.md](docs/INSTITUTIONAL_READINESS.md), [docs/OPERATIONS.md](docs/OPERATIONS.md), and [docs/CONTROL_MAPPING.md](docs/CONTROL_MAPPING.md).

## Limitations

See [LIMITATIONS.md](LIMITATIONS.md).

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## Citation

See [CITATION.cff](CITATION.cff).
