# Institutional Pack Example

This pack shows how a team can organize one probe run for an evidence review.

```bash
control-probe run \
  --spec specs/reserve_at_par.yaml \
  --adapter fixture \
  --fixture-file tests/fixtures/reserve_pass.json \
  --export json,markdown \
  --output-dir examples/institutional-pack/reports
```

Generated reports are intentionally ignored by Git. Store production evidence in the institution's controlled archive, not in this public template.
