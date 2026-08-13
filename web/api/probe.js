const BASELINE_SUPPLY = 10_000_000;
const BASELINE_RESERVE = 10_600_000;
const MINIMUM_BUFFER_RATIO = 1.05;

function evaluateScenario(name, label, shock) {
  const reserveAfter = BASELINE_RESERVE * (1 + shock);
  const required = BASELINE_SUPPLY * MINIMUM_BUFFER_RATIO;
  const ratio = reserveAfter / BASELINE_SUPPLY;
  return {
    name,
    label,
    shock,
    reserveAfter,
    required,
    ratio,
    status: reserveAfter >= required ? "pass" : "fail",
  };
}

export default function handler(_request, response) {
  response.status(200).json({
    controlId: "reserve-completeness-web-001",
    controlName: "Reserve Completeness Under Web Stress",
    generatedAt: new Date().toISOString(),
    baseline: {
      totalSupply: BASELINE_SUPPLY,
      reserveAssets: BASELINE_RESERVE,
      minimumBufferRatio: MINIMUM_BUFFER_RATIO,
    },
    assertion: "reserve_after_shock >= supply * 1.05",
    scenarios: [
      evaluateScenario("baseline", "Baseline observation", 0),
      evaluateScenario("minus-30-stress", "-30% reserve stress", -0.3),
    ],
  });
}
