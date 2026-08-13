# Limitations

- This tool produces a technical assessment, not a legal opinion or audit sign-off.
- The EVM adapter reads public on-chain data only. Off-chain reserve data requires the fixture adapter or a custom adapter.
- Assertion expressions are evaluated against point-in-time data. They do not represent continuous monitoring.
- Stress scenarios are parametric, not historically calibrated. Users should supply their own shock parameters.
- Non-EVM chains such as Canton, Corda, and Fabric require custom adapters and are not included in v0.1.
- The tool does not assess whether a control specification is complete or correct. It only evaluates whether the implementation data satisfies the specification as written.
