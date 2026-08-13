# Control Mapping

This project maps written control requirements to measurable implementation evidence.

| Domain | Example control | Metrics | Output evidence |
|---|---|---|---|
| Stablecoin reserves | Outstanding supply remains covered at par | `total_supply`, `reserve_balance`, `redemption_window` | JSON and Markdown report with stress scenario outcomes |
| Redemption operations | Redemption queue settles at par within target windows | `queue_depth`, `redemption_rate`, `par_value`, `settlement_value` | Scenario-level pass/fail table |
| Tokenized fund NAV | NAV is fresh and within tolerance of reference NAV | `last_nav_timestamp`, `current_timestamp`, `onchain_nav_per_share`, `reference_nav_per_share` | Assertion-level resolved values |

## Review Questions

- Does every metric have a clear data owner?
- Does every assertion map to a written control requirement?
- Are stress shocks approved by risk or treasury owners?
- Are fixture values synthetic, public, or approved for internal use?
- Does CI fail on critical control failure where appropriate?
