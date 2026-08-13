const DEFAULT_SPEC = {
  controlId: "reserve-completeness-web-001",
  controlName: "Reserve Completeness Under Web Stress",
  assertion: "reserve_after_shock >= supply * minimum_buffer_ratio",
  minimumBufferRatio: 1.05,
  scenarios: [
    { name: "baseline", label: "Baseline observation", shock: 0 },
    { name: "minus-30-stress", label: "-30% reserve stress", shock: -0.3 },
  ],
};

const DEFAULT_FIXTURE = {
  totalSupply: 10_000_000,
  reserveAssets: 10_600_000,
};

function parseJsonField(value, fieldName) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${fieldName} must be valid JSON`);
    }
  }
  return value;
}

function parseBody(request) {
  if (!request.body) {
    return {};
  }
  return typeof request.body === "string" ? JSON.parse(request.body) : request.body;
}

function requireFiniteNumber(value, fieldName) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
  return value;
}

function normalizePayload(body) {
  const spec = parseJsonField(body.spec ?? DEFAULT_SPEC, "spec");
  const fixture = parseJsonField(body.fixture ?? DEFAULT_FIXTURE, "fixture");

  const totalSupply = requireFiniteNumber(fixture.totalSupply, "fixture.totalSupply");
  const reserveAssets = requireFiniteNumber(
    fixture.reserveAssets,
    "fixture.reserveAssets",
  );
  const minimumBufferRatio = requireFiniteNumber(
    spec.minimumBufferRatio,
    "spec.minimumBufferRatio",
  );

  if (!Array.isArray(spec.scenarios) || spec.scenarios.length === 0) {
    throw new Error("spec.scenarios must contain at least one scenario");
  }

  return {
    spec: {
      controlId: String(spec.controlId || DEFAULT_SPEC.controlId),
      controlName: String(spec.controlName || DEFAULT_SPEC.controlName),
      assertion: String(spec.assertion || DEFAULT_SPEC.assertion),
      minimumBufferRatio,
      scenarios: spec.scenarios.map((scenario, index) => ({
        name: String(scenario.name || `scenario-${index + 1}`),
        label: String(scenario.label || scenario.name || `Scenario ${index + 1}`),
        shock: requireFiniteNumber(scenario.shock, `spec.scenarios[${index}].shock`),
      })),
    },
    fixture: {
      totalSupply,
      reserveAssets,
    },
  };
}

function evaluateScenario(scenario, fixture, minimumBufferRatio) {
  const reserveAfter = fixture.reserveAssets * (1 + scenario.shock);
  const required = fixture.totalSupply * minimumBufferRatio;
  const ratio = reserveAfter / fixture.totalSupply;
  return {
    name: scenario.name,
    label: scenario.label,
    shock: scenario.shock,
    reserveAfter,
    required,
    ratio,
    status: reserveAfter >= required ? "pass" : "fail",
  };
}

export default function handler(request, response) {
  if (!["GET", "POST"].includes(request.method ?? "GET")) {
    response.status(405).json({ error: "Only GET and POST are supported" });
    return;
  }

  try {
    const { spec, fixture } = normalizePayload(parseBody(request));
    response.status(200).json({
      controlId: spec.controlId,
      controlName: spec.controlName,
      generatedAt: new Date().toISOString(),
      baseline: {
        totalSupply: fixture.totalSupply,
        reserveAssets: fixture.reserveAssets,
        minimumBufferRatio: spec.minimumBufferRatio,
      },
      assertion: spec.assertion,
      scenarios: spec.scenarios.map((scenario) =>
        evaluateScenario(scenario, fixture, spec.minimumBufferRatio),
      ),
    });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Invalid probe payload",
    });
  }
}

export { DEFAULT_FIXTURE, DEFAULT_SPEC };
