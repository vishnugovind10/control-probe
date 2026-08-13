import handler from "../api/probe.js";

async function callHandler(request) {
  let statusCode = 0;
  let payload = null;

  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
    },
  };

  await handler(request, response);
  return { payload, statusCode };
}

function expectStatus(result, expectedStatus) {
  if (result.statusCode !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${result.statusCode}`);
  }
}

const defaultResult = await callHandler({ method: "GET" });
expectStatus(defaultResult, 200);

const baseline = defaultResult.payload.scenarios.find(
  (scenario) => scenario.name === "baseline",
);
const stress = defaultResult.payload.scenarios.find(
  (scenario) => scenario.name === "minus-30-stress",
);

if (!baseline || baseline.status !== "pass") {
  throw new Error("Expected baseline scenario to pass");
}

if (!stress || stress.status !== "fail" || stress.shock !== -0.3) {
  throw new Error("Expected -30% stress scenario to fail");
}

const customResult = await callHandler({
  method: "POST",
  body: {
    spec: JSON.stringify({
      controlId: "custom-control",
      controlName: "Custom Reserve Probe",
      assertion: "reserve_after_shock >= supply * minimum_buffer_ratio",
      minimumBufferRatio: 1.1,
      scenarios: [{ name: "mild", label: "Mild drawdown", shock: -0.05 }],
    }),
    fixture: JSON.stringify({
      totalSupply: 100,
      reserveAssets: 120,
    }),
  },
});
expectStatus(customResult, 200);

const customScenario = customResult.payload.scenarios[0];
if (
  customResult.payload.controlId !== "custom-control" ||
  customScenario.reserveAfter !== 114 ||
  customScenario.status !== "pass"
) {
  throw new Error("Expected custom POST payload to drive probe output");
}

const invalidResult = await callHandler({
  method: "POST",
  body: { spec: "{", fixture: "{}" },
});
expectStatus(invalidResult, 400);

console.log("probe API contract passed");
