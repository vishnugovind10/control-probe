import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileJson,
  Layers3,
  LockKeyhole,
  Play,
  Scale,
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

type ScenarioPreset = ScenarioInput & {
  description: string;
};

type ScenarioPack = {
  id: string;
  label: string;
  controlName: string;
  reserveAssets: number;
  minimumBufferRatio: number;
  scenarios: ScenarioInput[];
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
};

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    name: "baseline",
    label: "Baseline observation",
    shock: 0,
    description: "No reserve movement",
  },
  {
    name: "minor-drawdown",
    label: "Minor reserve drawdown",
    shock: -0.05,
    description: "Five percent reserve decline",
  },
  {
    name: "rate-shock",
    label: "Rate shock reserve loss",
    shock: -0.12,
    description: "Yield and liquidation pressure",
  },
  {
    name: "liquidity-stress",
    label: "Liquidity stress",
    shock: -0.2,
    description: "Large redemption pressure",
  },
  {
    name: "severe-market-stress",
    label: "Severe market stress",
    shock: -0.3,
    description: "Thirty percent reserve decline",
  },
  {
    name: "operational-freeze",
    label: "Operational freeze",
    shock: -0.45,
    description: "Unavailable reserves after incident",
  },
];

const SCENARIO_PACKS: ScenarioPack[] = [
  {
    id: "assurance-review",
    label: "External assurance review",
    controlName: "Reserve Completeness Evidence Dossier",
    reserveAssets: 10_750_000,
    minimumBufferRatio: 1.08,
    scenarios: [
      SCENARIO_PRESETS[0],
      SCENARIO_PRESETS[1],
      SCENARIO_PRESETS[2],
      SCENARIO_PRESETS[3],
      SCENARIO_PRESETS[4],
    ],
  },
  {
    id: "committee-review",
    label: "Risk committee review",
    controlName: "Reserve Completeness Under Web Stress",
    reserveAssets: 10_600_000,
    minimumBufferRatio: 1.05,
    scenarios: [
      SCENARIO_PRESETS[0],
      SCENARIO_PRESETS[1],
      SCENARIO_PRESETS[3],
      SCENARIO_PRESETS[4],
    ],
  },
  {
    id: "treasury-daily",
    label: "Treasury daily monitor",
    controlName: "Daily Reserve Coverage Monitor",
    reserveAssets: 11_400_000,
    minimumBufferRatio: 1.02,
    scenarios: [
      SCENARIO_PRESETS[0],
      SCENARIO_PRESETS[1],
      SCENARIO_PRESETS[2],
      SCENARIO_PRESETS[3],
    ],
  },
  {
    id: "incident-response",
    label: "Incident response drill",
    controlName: "Reserve Availability Incident Probe",
    reserveAssets: 10_250_000,
    minimumBufferRatio: 1.05,
    scenarios: [
      SCENARIO_PRESETS[0],
      SCENARIO_PRESETS[2],
      SCENARIO_PRESETS[4],
      SCENARIO_PRESETS[5],
    ],
  },
];

const DOSSIER_ITEMS = [
  {
    label: "Control objective",
    value: "Reserve assets remain above outstanding supply plus approved buffer.",
  },
  {
    label: "Evidence source",
    value: "Submitted fixture payload or read-only implementation adapter output.",
  },
  {
    label: "Reperformance",
    value: "Serverless API returns deterministic scenario-level JSON results.",
  },
  {
    label: "Exception path",
    value: "Any critical failure is isolated by scenario and preserved in output.",
  },
];

const REVIEW_CHECKS = [
  "Control ID and assertion are explicit.",
  "Data source boundary is stated before execution.",
  "Scenario shocks are visible and reproducible.",
  "Pass/fail status is computed, not narrated.",
  "Generated evidence includes timestamp and control reference.",
];

const GOVERNANCE_POINTS = [
  {
    label: "Disclosure boundary",
    value: "Synthetic defaults; no production balances, credentials, or private keys.",
  },
  {
    label: "Review posture",
    value: "Technical evidence package for engineering and control-owner review.",
  },
  {
    label: "Residual risk",
    value: "Point-in-time evaluation; not a legal opinion or assurance sign-off.",
  },
];

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

function formatGeneratedAt(value: string | null): string {
  if (!value) {
    return "Not executed";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function App() {
  const [probe, setProbe] = useState<ProbeResponse | null>(null);
  const [scenarioPackId, setScenarioPackId] = useState(SCENARIO_PACKS[0].id);
  const [controlId, setControlId] = useState(DEFAULT_SPEC.controlId);
  const [controlName, setControlName] = useState(DEFAULT_SPEC.controlName);
  const [assertion, setAssertion] = useState(DEFAULT_SPEC.assertion);
  const [totalSupply, setTotalSupply] = useState(DEFAULT_BASELINE.totalSupply);
  const [reserveAssets, setReserveAssets] = useState(DEFAULT_BASELINE.reserveAssets);
  const [minimumBufferRatio, setMinimumBufferRatio] = useState(
    DEFAULT_BASELINE.minimumBufferRatio,
  );
  const [scenarioInputs, setScenarioInputs] = useState<ScenarioInput[]>(
    SCENARIO_PACKS[0].scenarios,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseline = probe?.baseline ?? {
    totalSupply,
    reserveAssets,
    minimumBufferRatio,
  };
  const scenarios: Scenario[] = useMemo(
    () =>
      probe?.scenarios ??
      scenarioInputs.map((scenario) => {
        const reserveAfter = reserveAssets * (1 + scenario.shock);
        const required = totalSupply * minimumBufferRatio;
        return {
          ...scenario,
          reserveAfter,
          required,
          ratio: reserveAfter / totalSupply,
          status: "idle",
        };
      }),
    [minimumBufferRatio, probe?.scenarios, reserveAssets, scenarioInputs, totalSupply],
  );

  const failedScenarioCount = scenarios.filter(
    (scenario) => scenario.status === "fail",
  ).length;
  const passedScenarioCount = scenarios.filter(
    (scenario) => scenario.status === "pass",
  ).length;
  const portfolioStatus: ScenarioStatus =
    probe && failedScenarioCount > 0 ? "fail" : probe ? "pass" : "idle";
  const coverageDelta = baseline.reserveAssets - baseline.totalSupply;

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

  function applyScenarioPack(packId: string) {
    const pack = SCENARIO_PACKS.find((option) => option.id === packId);
    if (!pack) {
      return;
    }
    setScenarioPackId(pack.id);
    setControlName(pack.controlName);
    setReserveAssets(pack.reserveAssets);
    setMinimumBufferRatio(pack.minimumBufferRatio);
    setScenarioInputs(pack.scenarios);
    setProbe(null);
    setError(null);
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
    setProbe(null);
  }

  function applyScenarioPreset(index: number, presetName: string) {
    const preset = SCENARIO_PRESETS.find((option) => option.name === presetName);
    if (!preset) {
      return;
    }
    setScenarioInputs((current) =>
      current.map((scenario, scenarioIndex) =>
        scenarioIndex === index
          ? { name: preset.name, label: preset.label, shock: preset.shock }
          : scenario,
      ),
    );
    setProbe(null);
  }

  function addScenario() {
    const nextPreset = SCENARIO_PRESETS[Math.min(scenarioInputs.length, 5)];
    setScenarioInputs((current) => [
      ...current,
      {
        name: `${nextPreset.name}-${current.length + 1}`,
        label: nextPreset.label,
        shock: nextPreset.shock,
      },
    ]);
    setProbe(null);
  }

  function removeScenario(index: number) {
    setScenarioInputs((current) =>
      current.length > 1
        ? current.filter((_, scenarioIndex) => scenarioIndex !== index)
        : current,
    );
    setProbe(null);
  }

  function updateControlField(update: () => void) {
    update();
    setProbe(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar" aria-label="Product header">
        <div className="brand-lockup">
          <div className="brand-mark">
            <ShieldCheck size={18} aria-hidden="true" />
          </div>
          <div>
            <span>control-probe</span>
            <strong>Institutional Control Evidence</strong>
          </div>
        </div>
        <div className="topbar-meta">
          <span>Serverless execution</span>
          <StatusPill status={portfolioStatus} />
        </div>
      </header>

      <section className="hero-panel" aria-labelledby="page-title">
        <div className="hero-copy">
          <div className="eyebrow">
            <Building2 size={16} aria-hidden="true" />
            Reserve assurance workspace
          </div>
          <h1 id="page-title">Prepare control evidence for external review.</h1>
          <p>
            Configure reserve inputs, select a review scenario pack, and submit
            reproducible stress cases to a serverless probe API with clear
            evidence boundaries.
          </p>
          <div className="workflow-strip" aria-label="Control workflow">
            <WorkflowStep icon={<Database size={16} />} label="Fixture" />
            <WorkflowStep icon={<Layers3 size={16} />} label="Scenarios" />
            <WorkflowStep icon={<ClipboardCheck size={16} />} label="Evidence" />
            <WorkflowStep icon={<BookOpenCheck size={16} />} label="Review" />
          </div>
        </div>
        <aside className="probe-card" aria-label="Reserve control probe">
          <div className="probe-card__header">
            <div>
              <span className="panel-label">Control summary</span>
              <h2>{controlName}</h2>
            </div>
            <StatusPill status={portfolioStatus} />
          </div>
          <div className="metric-grid">
            <Metric label="Token supply" value={formatMoney(baseline.totalSupply)} />
            <Metric label="Reserve assets" value={formatMoney(baseline.reserveAssets)} />
            <Metric label="Coverage surplus" value={formatMoney(coverageDelta)} />
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
            {isRunning ? "Running probe" : "Run probe"}
          </button>
          {error ? <p className="error-message">API error: {error}</p> : null}
        </aside>
      </section>

      <section className="input-section" aria-label="Probe inputs">
        <div className="section-heading">
          <div>
            <span className="panel-label">
              <SlidersHorizontal size={16} aria-hidden="true" />
              Probe configuration
            </span>
            <h2>Inputs, controls, and scenario pack</h2>
          </div>
          <p>
            Use the dropdown presets for assurance-style review packages, then
            refine individual stress cases before execution.
          </p>
        </div>
        <form className="probe-form" onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid form-grid--wide">
            <SelectField
              label="Scenario pack"
              value={scenarioPackId}
              onChange={applyScenarioPack}
              options={SCENARIO_PACKS.map((pack) => ({
                label: pack.label,
                value: pack.id,
              }))}
            />
            <TextField
              label="Control ID"
              value={controlId}
              onChange={(value) => updateControlField(() => setControlId(value))}
            />
            <TextField
              label="Control name"
              value={controlName}
              onChange={(value) => updateControlField(() => setControlName(value))}
            />
          </div>
          <div className="form-grid form-grid--wide">
            <TextField
              label="Assertion"
              value={assertion}
              onChange={(value) => updateControlField(() => setAssertion(value))}
            />
            <NumberField
              label="Token supply"
              value={totalSupply}
              min={0}
              onChange={(value) => updateControlField(() => setTotalSupply(value))}
            />
            <NumberField
              label="Reserve assets"
              value={reserveAssets}
              min={0}
              onChange={(value) => updateControlField(() => setReserveAssets(value))}
            />
            <NumberField
              label="Minimum buffer ratio"
              value={minimumBufferRatio}
              min={0}
              step={0.01}
              onChange={(value) =>
                updateControlField(() => setMinimumBufferRatio(value))
              }
            />
          </div>
          <div className="scenario-toolbar">
            <div>
              <span className="panel-label">Scenario matrix</span>
              <h3>{scenarioInputs.length} submitted scenarios</h3>
            </div>
            <button className="secondary-button" type="button" onClick={addScenario}>
              Add scenario
            </button>
          </div>
          <div className="scenario-form-grid">
            {scenarioInputs.map((scenario, index) => (
              <fieldset className="scenario-fieldset" key={`${scenario.name}-${index}`}>
                <legend>Scenario {index + 1}</legend>
                <SelectField
                  label="Preset"
                  value={scenario.name}
                  onChange={(value) => applyScenarioPreset(index, value)}
                  options={SCENARIO_PRESETS.map((preset) => ({
                    label: preset.label,
                    value: preset.name,
                  }))}
                />
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
                <button
                  className="text-button"
                  disabled={scenarioInputs.length === 1}
                  type="button"
                  onClick={() => removeScenario(index)}
                >
                  Remove
                </button>
              </fieldset>
            ))}
          </div>
        </form>
      </section>

      <section className="dossier-section" aria-label="Review dossier">
        <div className="section-heading">
          <div>
            <span className="panel-label">
              <FileCheck2 size={16} aria-hidden="true" />
              Review dossier
            </span>
            <h2>Evidence package readiness</h2>
          </div>
          <p>
            The page presents the minimum context an external reviewer expects:
            objective, source boundary, reperformance path, and exception trail.
          </p>
        </div>
        <div className="dossier-grid">
          {DOSSIER_ITEMS.map((item) => (
            <EvidenceCard key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
        <div className="review-layout">
          <div className="review-panel">
            <div className="review-panel__header">
              <Scale size={18} aria-hidden="true" />
              <h3>Readiness checklist</h3>
            </div>
            <ul className="check-list">
              {REVIEW_CHECKS.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="review-panel">
            <div className="review-panel__header">
              <LockKeyhole size={18} aria-hidden="true" />
              <h3>Governance notes</h3>
            </div>
            <div className="governance-list">
              {GOVERNANCE_POINTS.map((item) => (
                <EvidenceCard key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="results-section" aria-label="Probe results">
        <div className="section-heading">
          <div>
            <span className="panel-label">Execution trace</span>
            <h2>Scenario outcomes</h2>
          </div>
          <p>
            Results are produced from the submitted spec and fixture payload,
            with each scenario evaluated independently.
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
          {scenarios.map((scenario, index) => (
            <ScenarioRow key={`${scenario.name}-${index}`} scenario={scenario} />
          ))}
        </div>
      </section>

      <section className="evidence-strip" aria-label="Evidence summary">
        <EvidenceItem
          icon={<Activity size={18} aria-hidden="true" />}
          label="Run state"
          value={`${passedScenarioCount} pass / ${failedScenarioCount} fail`}
        />
        <EvidenceItem
          icon={<FileJson size={18} aria-hidden="true" />}
          label="Output"
          value={probe ? `API result ${probe.controlId}` : "Awaiting execution"}
        />
        <EvidenceItem
          icon={<ArrowRight size={18} aria-hidden="true" />}
          label="Generated"
          value={formatGeneratedAt(probe?.generatedAt ?? null)}
        />
      </section>
    </main>
  );
}

function WorkflowStep({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="workflow-step">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function EvidenceCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="evidence-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
        value={Number.isNaN(value) ? "" : value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
