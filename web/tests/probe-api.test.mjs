import handler from "../api/probe.js";

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

handler({}, response);

if (statusCode !== 200) {
  throw new Error(`Expected status 200, got ${statusCode}`);
}

const baseline = payload.scenarios.find((scenario) => scenario.name === "baseline");
const stress = payload.scenarios.find(
  (scenario) => scenario.name === "minus-30-stress",
);

if (!baseline || baseline.status !== "pass") {
  throw new Error("Expected baseline scenario to pass");
}

if (!stress || stress.status !== "fail" || stress.shock !== -0.3) {
  throw new Error("Expected -30% stress scenario to fail");
}

console.log("probe API contract passed");
