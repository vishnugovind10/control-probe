import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileJson,
  Play,
  ShieldCheck,
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

const DEFAULT_BASELINE = {
  totalSupply: 10_000_000,
  reserveAssets: 10_600_000,
  minimumBufferRatio: 1.05,
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRatio(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function App() {
  const [probe, setProbe] = useState<ProbeResponse | null>(null);
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
      const response = await fetch("/api/probe", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Probe API returned ${response.status}`);
      }
      const data = (await response.json()) as ProbeResponse;
      setProbe(data);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Probe API request failed";
      setError(message);
    } finally {
      setIsRunning(false);
    }
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
            A reserve coverage probe that passes at baseline and exposes the
            failure under a deterministic -30% stress scenario.
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
          value="reserve_after_shock >= supply * 1.05"
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
      <span role="cell">{scenario.shock === 0 ? "0%" : "-30%"}</span>
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
