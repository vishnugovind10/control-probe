import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileJson,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import "./styles.css";

type ScenarioStatus = "idle" | "pass" | "fail";

type Scenario = {
  name: string;
  label: string;
  shock: number;
  reserveAfter: number;
  required: number;
  ratio: number;
  status: ScenarioStatus;
};

type ProbeResponse = {
  controlId: string;
  controlName: string;
  generatedAt: string;
  baseline: {
    totalSupply: number;
    reserveAssets: number;
    minimumBufferRatio: number;
  };
  assertion: string;
  scenarios: Scenario[];
};

type ScenarioInput = {
  name: string;
  label: string;
  shock: number;
};

const DEFAULT_BASELINE = {
  totalSupply: 10_000_000,
  reserveAssets: 10_600_000,
  minimumBufferRatio: 1.05,
};

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

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRatio(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatShock(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function App() {
  const [probe, setProbe] = useState<ProbeResponse | null>(null);
  const [controlId, setControlId] = useState(DEFAULT_SPEC.controlId);
  const [controlName, setControlName] = useState(DEFAULT_SPEC.controlName);
  const [assertion, setAssertion] = useState(DEFAULT_SPEC.assertion);
  const [totalSupply, setTotalSupply] = useState(DEFAULT_FIXTURE.totalSupply);
  const [reserveAssets, setReserveAssets] = useState(DEFAULT_FIXTURE.reserveAssets);
  const [minimumBufferRatio, setMinimumBufferRatio] = useState(
    DEFAULT_SPEC.minimumBufferRatio,
  );
  const [scenarioInputs, setScenarioInputs] = useState<ScenarioInput[]>(
    DEFAULT_SPEC.scenarios,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseline = probe?.baseline ?? DEFAULT_BASELINE;
  const scenarios: Scenario[] =
    probe?.scenarios ??
    [
      {
        name: "baseline",
        label: "Baseline observation",
        shock: 0,
        reserveAfter: DEFAULT_BASELINE.reserveAssets,
        required:
          DEFAULT_BASELINE.totalSupply * DEFAULT_BASELINE.minimumBufferRatio,
        ratio: DEFAULT_BASELINE.reserveAssets / DEFAULT_BASELINE.totalSupply,
        status: "idle",
      },
      {
        name: "minus-30-stress",
        label: "-30% reserve stress",
        shock: -0.3,
        reserveAfter: DEFAULT_BASELINE.reserveAssets * 0.7,
        required:
          DEFAULT_BASELINE.totalSupply * DEFAULT_BASELINE.minimumBufferRatio,
        ratio: (DEFAULT_BASELINE.reserveAssets * 0.7) / DEFAULT_BASELINE.totalSupply,
        status: "idle",
      },
    ];

  const failedScenario = scenarios.find((scenario) => scenario.status === "fail");

  async function runProbe() {
    setIsRunning(true);
    setError(null);
    try {
      const spec = {
        controlId,
        controlName,
        assertion,
        minimumBufferRatio,
        scenarios: scenarioInputs,
      };
      const fixture = {
        totalSupply,
        reserveAssets,
      };
      const response = await fetch("/api/probe", {
        method: "POST",
        body: JSON.stringify({
          spec: JSON.stringify(spec),
          fixture: JSON.stringify(fixture),
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Probe API returned ${response.status}`);
      }
      setProbe(data as ProbeResponse);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Probe API request failed";
      setError(message);
    } finally {
      setIsRunning(false);
    }
  }

  function updateScenario(
    index: number,
    field: keyof ScenarioInput,
    value: string | number,
  ) {
    setScenarioInputs((current) =>
      current.map((scenario, scenarioIndex) =>
        scenarioIndex === index ? { ...scenario, [field]: value } : scenario,
      ),
    );
  }

  return (
    <main className="app-shell">
      <section className="hero-panel" aria-labelledby="page-title">
        <div className="hero-copy">
          <div className="eyebrow">
            <ShieldCheck size={16} aria-hidden="true" />
            control-probe web
          </div>
          <h1 id="page-title">Control evidence that fails where it should.</h1>
          <p>
            Submit a control spec and fixture data to run reserve coverage
            checks through a Vercel serverless API.
          </p>
        </div>
        <div className="probe-card" aria-label="Reserve control probe">
          <div className="probe-card__header">
            <div>
              <span className="panel-label">Reserve completeness</span>
              <h2>Coverage under stress</h2>
            </div>
            <StatusPill status={probe ? (failedScenario ? "fail" : "pass") : "idle"} />
          </div>
          <div className="metric-grid">
            <Metric label="Token supply" value={formatMoney(baseline.totalSupply)} />
            <Metric label="Reserve assets" value={formatMoney(baseline.reserveAssets)} />
            <Metric
              label="Required buffer"
              value={formatRatio(baseline.minimumBufferRatio)}
            />
          </div>
          <button
            className="run-button"
            type="button"
            disabled={isRunning}
            onClick={runProbe}
          >
            <Play size={18} aria-hidden="true" />
            {isRunning ? "Running" : "Run"}
          </button>
          {error ? <p className="error-message">API error: {error}</p> : null}
        </div>
      </section>

      <section className="input-section" aria-label="Probe inputs">
        <div className="section-heading">
          <div>
            <span className="panel-label">
              <SlidersHorizontal size={16} aria-hidden="true" />
              Submitted inputs
            </span>
            <h2>Probe input form</h2>
          </div>
          <p>
            Edit control metadata, observed balances, and stress scenarios. The
            form submits a spec and fixture payload to the serverless API.
          </p>
        </div>
        <form className="probe-form" onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid form-grid--wide">
            <TextField
              label="Control ID"
              value={controlId}
              onChange={setControlId}
            />
            <TextField
              label="Control name"
              value={controlName}
              onChange={setControlName}
            />
            <TextField label="Assertion" value={assertion} onChange={setAssertion} />
          </div>
          <div className="form-grid">
            <NumberField
              label="Token supply"
              value={totalSupply}
              min={0}
              onChange={setTotalSupply}
            />
            <NumberField
              label="Reserve assets"
              value={reserveAssets}
              min={0}
              onChange={setReserveAssets}
            />
            <NumberField
              label="Minimum buffer ratio"
              value={minimumBufferRatio}
              min={0}
              step={0.01}
              onChange={setMinimumBufferRatio}
            />
          </div>
          <div className="scenario-form-grid">
            {scenarioInputs.map((scenario, index) => (
              <fieldset className="scenario-fieldset" key={index}>
                <legend>{index === 0 ? "Baseline scenario" : "Stress scenario"}</legend>
                <TextField
                  label="Scenario name"
                  value={scenario.name}
                  onChange={(value) => updateScenario(index, "name", value)}
                />
                <TextField
                  label="Scenario label"
                  value={scenario.label}
                  onChange={(value) => updateScenario(index, "label", value)}
                />
                <NumberField
                  label="Shock"
                  value={scenario.shock}
                  min={-1}
                  step={0.01}
                  onChange={(value) => updateScenario(index, "shock", value)}
                />
              </fieldset>
            ))}
          </div>
        </form>
      </section>

      <section className="results-section" aria-label="Probe results">
        <div className="section-heading">
          <div>
            <span className="panel-label">Execution trace</span>
            <h2>Same control, two conditions</h2>
          </div>
          <p>
            The baseline row proves current coverage. The stress row shows
            where reserve coverage breaks.
          </p>
        </div>

        <div className="scenario-table" role="table" aria-label="Scenario outcomes">
          <div className="scenario-table__row scenario-table__row--head" role="row">
            <span role="columnheader">Scenario</span>
            <span role="columnheader">Shock</span>
            <span role="columnheader">Reserve after shock</span>
            <span role="columnheader">Required</span>
            <span role="columnheader">Status</span>
          </div>
          {scenarios.map((scenario) => (
            <ScenarioRow key={scenario.name} scenario={scenario} />
          ))}
        </div>
      </section>

      <section className="evidence-strip" aria-label="Evidence summary">
        <EvidenceItem
          icon={<Activity size={18} aria-hidden="true" />}
          label="Assertion"
          value={probe?.assertion ?? DEFAULT_SPEC.assertion}
        />
        <EvidenceItem
          icon={<FileJson size={18} aria-hidden="true" />}
          label="Output"
          value={probe ? `API result ${probe.controlId}` : "Serverless API result"}
        />
        <EvidenceItem
          icon={<ArrowRight size={18} aria-hidden="true" />}
          label="Signal"
          value="Critical stress failure is visible without narration"
        />
      </section>
    </main>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({
  label,
  max,
  min,
  onChange,
  step = 1,
  value,
}: {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        max={max}
        min={min}
        step={step}
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status }: { status: ScenarioStatus }) {
  const label = status === "idle" ? "Ready" : status === "pass" ? "PASS" : "FAIL";
  return <span className={`status-pill status-pill--${status}`}>{label}</span>;
}

function ScenarioRow({ scenario }: { scenario: Scenario }) {
  return (
    <div
      className={`scenario-table__row scenario-table__row--${scenario.status}`}
      role="row"
    >
      <span role="cell">
        <strong>{scenario.label}</strong>
      </span>
      <span role="cell">{formatShock(scenario.shock)}</span>
      <span role="cell">{formatMoney(scenario.reserveAfter)}</span>
      <span role="cell">{formatMoney(scenario.required)}</span>
      <span role="cell">
        <span className={`outcome outcome--${scenario.status}`}>
          {scenario.status === "pass" ? (
            <CheckCircle2 size={16} aria-hidden="true" />
          ) : scenario.status === "fail" ? (
            <TriangleAlert size={16} aria-hidden="true" />
          ) : (
            <Activity size={16} aria-hidden="true" />
          )}
          {scenario.status === "idle"
            ? "Pending"
            : scenario.status === "pass"
              ? "PASS"
              : "FAIL"}
        </span>
      </span>
    </div>
  );
}

function EvidenceItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="evidence-item">
      <div className="evidence-item__icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
