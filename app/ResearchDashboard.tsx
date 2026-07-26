"use client";

import { useMemo, useState } from "react";

type ScenarioKey = "Base" | "Bull" | "Bear" | "Custom";
type HistoryMetric = "Revenue" | "Core PBT" | "Throughput";
type SourceCategory = "All" | "Macro" | "GMD" | "Peers" | "Market";

type ScenarioInputs = {
  nationalGrowth: number;
  marketShare: number;
  unitGrowth: number;
  margin: number;
  associateGrowth: number;
  capex: number;
  wacc: number;
  terminalGrowth: number;
  pe: number;
};

const CURRENT_PRICE = 73_200;
const SHARES = 426.495109;
const REPORT_TARGETS: Record<Exclude<ScenarioKey, "Custom">, number> = {
  Base: 84_500,
  Bull: 115_500,
  Bear: 51_000,
};

const presets: Record<Exclude<ScenarioKey, "Custom">, ScenarioInputs> = {
  Base: {
    nationalGrowth: 10,
    marketShare: 15.2,
    unitGrowth: 2.5,
    margin: 28,
    associateGrowth: 10,
    capex: 1400,
    wacc: 11.5817,
    terminalGrowth: 4,
    pe: 16,
  },
  Bull: {
    nationalGrowth: 14,
    marketShare: 15.4,
    unitGrowth: 4,
    margin: 28.5,
    associateGrowth: 15,
    capex: 1450,
    wacc: 10.4541,
    terminalGrowth: 4.5,
    pe: 17,
  },
  Bear: {
    nationalGrowth: 5,
    marketShare: 14.8,
    unitGrowth: -1,
    margin: 26,
    associateGrowth: 2,
    capex: 1500,
    wacc: 12.7599,
    terminalGrowth: 3,
    pe: 13,
  },
};

const history = {
  years: ["2021A", "2022A", "2023A", "2024A", "2025A"],
  Revenue: [3206, 3898, 3846, 4832, 5956],
  "Core PBT": [806, 1308, 1307, 1781, 2521],
  Throughput: [2.627, 3.1, 3.011, 4.435, 5.079],
};

const macroTrade = [668.54, 732.5, 683, 786.29, 930.05];

const peerCriteria = [
  {
    label: "Asset position & route connectivity",
    short: "Asset position",
    weight: 25,
    scores: { GMD: 5, VSC: 4, PHP: 4.5, DVP: 2 },
  },
  {
    label: "Growth capacity & expansion runway",
    short: "Growth runway",
    weight: 20,
    scores: { GMD: 5, VSC: 3.5, PHP: 4.5, DVP: 2 },
  },
  {
    label: "2025 volume & earnings momentum",
    short: "Momentum",
    weight: 15,
    scores: { GMD: 5, VSC: 4, PHP: 3, DVP: 2 },
  },
  {
    label: "Earnings quality & resilience",
    short: "Earnings quality",
    weight: 15,
    scores: { GMD: 4, VSC: 3, PHP: 4, DVP: 5 },
  },
  {
    label: "Port-thesis purity",
    short: "Thesis purity",
    weight: 10,
    scores: { GMD: 4, VSC: 2, PHP: 5, DVP: 5 },
  },
  {
    label: "Disclosure & modelability",
    short: "Disclosure",
    weight: 10,
    scores: { GMD: 5, VSC: 3, PHP: 4, DVP: 4 },
  },
  {
    label: "Risk balance",
    short: "Risk balance",
    weight: 5,
    scores: { GMD: 3.5, VSC: 3, PHP: 3.5, DVP: 2 },
  },
];

const chain = [
  {
    kicker: "01 · MACRO",
    title: "Trade & FDI",
    value: "+27.1%",
    description:
      "1H2026 merchandise trade growth supports the demand backdrop, but trade value is not treated as physical container volume.",
  },
  {
    kicker: "02 · INDUSTRY",
    title: "National TEU",
    value: "34m",
    description:
      "2025 national container throughput is the operating anchor. The model forecasts this series separately from trade value.",
  },
  {
    kicker: "03 · COMPANY",
    title: "GMD share",
    value: "15.2%",
    description:
      "Capacity is valuable only when it converts into routes, utilization and retained market share.",
  },
  {
    kicker: "04 · EARNINGS",
    title: "Core PBT",
    value: "3,009bn",
    description:
      "Throughput, unit/mix, margins and equity-accounted associates flow into attributable earnings.",
  },
  {
    kicker: "05 · VALUATION",
    title: "Target",
    value: "84,500",
    description:
      "A 50/50 blend of 2026E P/E and DCF/SOTP yields a marginal BUY, not a high-conviction call.",
  },
];

const sources = [
  {
    id: "SRC-M01",
    category: "Macro" as const,
    title: "NSO — 1H2026 Socio-economic Report",
    use: "Trade, exports, imports and FDI",
    url: "https://www.nso.gov.vn/wp-content/uploads/2026/07/VN.-T6.2026-final.pdf",
    status: "Official",
  },
  {
    id: "SRC-M02",
    category: "Macro" as const,
    title: "NSO — FY2025 Socio-economic Situation",
    use: "Annual merchandise trade",
    url: "https://www.nso.gov.vn/en/data-and-statistics/2026/01/socio-economic-situation-in-the-fourth-quarter-and-2025/",
    status: "Official",
  },
  {
    id: "SRC-I01",
    category: "Macro" as const,
    title: "Vietnam Maritime Administration",
    use: "National container throughput",
    url: "https://vimawa.gov.vn/vi/node/15301",
    status: "Regulator",
  },
  {
    id: "SRC-G01",
    category: "GMD" as const,
    title: "Gemadept Annual Report 2025",
    use: "Historical financials, throughput and capacity",
    url: "https://www.gemadept.com.vn/wp-content/uploads/2026/04/GMD-AR-2025_EN.pdf",
    status: "Issuer",
  },
  {
    id: "SRC-G02",
    category: "GMD" as const,
    title: "Gemadept IR Newsletter Q1 2026",
    use: "Current trading and regional throughput",
    url: "https://www.gemadept.com.vn/wp-content/uploads/2026/05/IR-NEWSLETTER-Q12026.pdf",
    status: "Issuer",
  },
  {
    id: "SRC-G03",
    category: "GMD" as const,
    title: "Gemadept AGM 2026 Business Plan",
    use: "Management plan and stretch targets",
    url: "https://www.gemadept.com.vn/wp-content/uploads/2026/04/AGM-2026-7.3.-Submission-03-Business-Plan-2026.pdf",
    status: "Issuer",
  },
  {
    id: "SRC-P02",
    category: "Peers" as const,
    title: "Port of Hai Phong Annual Report 2025",
    use: "PHP operating benchmark",
    url: "https://haiphongport.com.vn/FileUpload/Documents/annual_report_2025pdf.pdf",
    status: "Issuer",
  },
  {
    id: "SRC-P05",
    category: "Peers" as const,
    title: "Viconship Annual Report 2025",
    use: "VSC business and financial review",
    url: "https://viconship.com/wp-content/uploads/2026/04/CBTT-Bao-cao-thuong-nien-nam-2025.pdf",
    status: "Issuer",
  },
  {
    id: "SRC-P11",
    category: "Peers" as const,
    title: "Dinh Vu Port — 2026 AGM Board Report",
    use: "Channel constraints and service relocation",
    url: "https://dinhvuport.com.vn/aj/Download.ashx?Key=873",
    status: "Issuer",
  },
  {
    id: "SRC-P401",
    category: "Market" as const,
    title: "VNStock Market Data",
    use: "GMD close price on 24-Jul-2026",
    url: "https://vnstocks.com/docs/vnstock/du-lieu-thi-truong-market-data",
    status: "API",
  },
  {
    id: "SRC-API01",
    category: "Market" as const,
    title: "VNStock Fundamental API",
    use: "FY2021–FY2025 raw financial statements",
    url: "https://vnstocks.com/docs/vnstock/phan-tich-co-ban-fundamental",
    status: "API",
  },
  {
    id: "SRC-P403",
    category: "Market" as const,
    title: "ADB AsianBondsOnline — Vietnam",
    use: "Risk-free-rate anchor",
    url: "https://asianbondsonline.adb.org/vietnam/",
    status: "Multilateral",
  },
];

function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function roundTo500(value: number) {
  return Math.round(value / 500) * 500;
}

function RatingBadge({ rating }: { rating: string }) {
  return <span className={`rating-badge rating-${rating.toLowerCase()}`}>{rating}</span>;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const progress = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider-row">
      <span>
        {label}
        <strong>
          {formatNumber(value, step < 1 ? 1 : 0)}
          {suffix}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        style={{ "--range-progress": `${progress}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function ResearchDashboard() {
  const [activeChain, setActiveChain] = useState(0);
  const [historyMetric, setHistoryMetric] = useState<HistoryMetric>("Revenue");
  const [selectedYear, setSelectedYear] = useState(4);
  const [scenario, setScenario] = useState<ScenarioKey>("Base");
  const [inputs, setInputs] = useState<ScenarioInputs>(presets.Base);
  const [weights, setWeights] = useState(peerCriteria.map((criterion) => criterion.weight));
  const [sourceCategory, setSourceCategory] = useState<SourceCategory>("All");
  const [sourceQuery, setSourceQuery] = useState("");
  const [riskView, setRiskView] = useState<"Catalysts" | "Falsifiers">("Catalysts");

  const updateInput = (key: keyof ScenarioInputs, value: number) => {
    setScenario("Custom");
    setInputs((current) => ({ ...current, [key]: value }));
  };

  const selectScenario = (key: Exclude<ScenarioKey, "Custom">) => {
    setScenario(key);
    setInputs(presets[key]);
  };

  const outputs = useMemo(() => {
    const nationalTeu = 34 * (1 + inputs.nationalGrowth / 100);
    const gmdTeu = nationalTeu * (inputs.marketShare / 100);
    const portRevenue =
      5254.22761 * (gmdTeu / 5.079) * (1 + inputs.unitGrowth / 100);
    const logisticsRevenue = 693.74057 * 1.04;
    const revenue = portRevenue + logisticsRevenue + 8.057116;
    const operatingProfit = revenue * (inputs.margin / 100);
    const associates = 1157.659377947 * (1 + inputs.associateGrowth / 100);
    const corePbt = operatingProfit + 225 - 120 - 250 + associates - 11.5;
    const parentPat = corePbt * 0.905 * 0.78;
    const eps = (parentPat * 1000) / SHARES;
    const peValue = eps * inputs.pe;
    const spread = Math.max(2.5, inputs.wacc - inputs.terminalGrowth);
    const baseSpread = 11.5817 - 4;
    const capexAdjustment = Math.max(0.78, 1 + (1400 - inputs.capex) / 7000);
    const earningsAdjustment = Math.max(0.65, parentPat / 2124.3038);
    const dcfValue =
      88_988 * earningsAdjustment * (baseSpread / spread) * capexAdjustment;
    const blended = (peValue + dcfValue) / 2;
    const target =
      scenario === "Custom" ? roundTo500(blended) : REPORT_TARGETS[scenario];
    const upside = target / CURRENT_PRICE - 1;
    const rating = upside >= 0.15 ? "BUY" : upside <= -0.1 ? "SELL" : "HOLD";
    return {
      nationalTeu,
      gmdTeu,
      revenue,
      corePbt,
      parentPat,
      eps,
      peValue,
      dcfValue,
      target,
      upside,
      rating,
    };
  }, [inputs, scenario]);

  const peerScores = useMemo(() => {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    return (["GMD", "VSC", "PHP", "DVP"] as const)
      .map((ticker) => ({
        ticker,
        score: peerCriteria.reduce(
          (sum, criterion, index) =>
            sum + criterion.scores[ticker] * (weights[index] / totalWeight),
          0,
        ),
      }))
      .sort((a, b) => b.score - a.score);
  }, [weights]);

  const filteredSources = useMemo(() => {
    const query = sourceQuery.trim().toLowerCase();
    return sources.filter((source) => {
      const categoryMatch =
        sourceCategory === "All" || source.category === sourceCategory;
      const queryMatch =
        !query ||
        `${source.id} ${source.title} ${source.use}`.toLowerCase().includes(query);
      return categoryMatch && queryMatch;
    });
  }, [sourceCategory, sourceQuery]);

  const sensitivityRows = useMemo(() => {
    const waccs = [inputs.wacc - 0.5, inputs.wacc, inputs.wacc + 0.5];
    const growths = [
      inputs.terminalGrowth - 0.5,
      inputs.terminalGrowth,
      inputs.terminalGrowth + 0.5,
    ];
    return {
      waccs,
      growths,
      values: waccs.map((wacc) =>
        growths.map((growth) => {
          const spread = Math.max(2.5, wacc - growth);
          const value =
            outputs.dcfValue *
            ((inputs.wacc - inputs.terminalGrowth) / spread);
          return roundTo500(value);
        }),
      ),
    };
  }, [inputs, outputs.dcfValue]);

  const historyValues = history[historyMetric];
  const historyMax = Math.max(...historyValues);

  return (
    <main className="site light-theme">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="GMD project home">
          <span className="brand-mark">GMD</span>
          <span>Equity Research Project</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#summary">Investment case</a>
          <a href="#valuation">Valuation</a>
          <a href="#scenario">Forecasts</a>
          <a className="download-pill" href="#downloads">Downloads</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="kicker">Vietnam Ports · Equity Research</p>
          <h1>GMD: Export Recovery Meets Scarce Port Capacity</h1>
          <p className="hero-copy-text">
            A top-down investment case linking Vietnam&apos;s trade recovery to
            container throughput, GMD&apos;s market share and core earnings.
          </p>
          <p className="hero-meta">BUY · 12-month target · Market data as of 24 Jul 2026</p>
          <div className="hero-actions">
            <a className="btn primary" href="#summary">Read investment case</a>
            <a className="btn" href="#valuation">Open valuation module</a>
          </div>
        </div>

        <aside className="hero-card" aria-label="Valuation snapshot">
          <span>Selected blended target</span>
          <strong>84,500</strong>
          <small>VND/share · 15.4% upside</small>
          <div className="hero-card-grid">
            <div>
              <span>Current</span>
              <b>73,200</b>
            </div>
            <div>
              <span>Horizon</span>
              <b>12 months</b>
            </div>
          </div>
        </aside>
      </section>

      <section id="summary" className="investment-summary" aria-label="Investment summary">
        <div className="summary-main">
          <p className="eyebrow">Investment Summary</p>
          <div className="summary-title-row">
            <h2>GMD investment view</h2>
            <span className="summary-scenario">Base case</span>
          </div>
          <div className="recommendation-line">
            <div>
              <span>Recommendation</span>
              <strong className="summary-buy">BUY</strong>
              <small>Based on the blended target price versus the current market price.</small>
            </div>
            <div>
              <span>Selected target</span>
              <strong>84,500</strong>
              <small>15.4% upside from VND 73,200/share.</small>
            </div>
          </div>
          <div className="summary-range">
            <div><span>Bear / Bull</span><b>51,000 / 115,500</b></div>
            <div><span>2026E revenue</span><b>6,757bn</b></div>
            <div><span>2026E core PBT</span><b>3,009bn</b></div>
            <div><span>Investment horizon</span><b>12 months</b></div>
          </div>
        </div>

        <div className="summary-lists">
          <article>
            <div className="list-head"><span>Research path</span><b>How the report builds the case</b></div>
            <ol className="clean-list">
              <li><strong>Macro → TEU</strong><small>Trade is the backdrop; physical container throughput is the operating link.</small></li>
              <li><strong>Stock selection</strong><small>GMD ranks first in the weighted port screen versus PHP, VSC and DVP.</small></li>
              <li><strong>Historical evidence</strong><small>Throughput and core profit scaled while associates became material.</small></li>
              <li><strong>Forecast</strong><small>Share gains and lower expansion capex support cash conversion.</small></li>
              <li><strong>Valuation</strong><small>A 50/50 P/E and DCF/SOTP blend produces the selected target.</small></li>
            </ol>
          </article>
          <article>
            <div className="list-head risk"><span>Risk balance</span><b>What the report actually tests</b></div>
            <ol className="clean-list risk-list">
              <li><strong>4 catalysts</strong><small>Trade and FDI, Nam Dinh Vu Phase 3, Gemalink Phase 2 and unit/mix improvement.</small></li>
              <li><strong>4 downside triggers</strong><small>National TEU, market share, project timing and parent-level cash conversion.</small></li>
              <li><strong>Limited margin of safety</strong><small>15.4% base-case upside is balanced by a VND 51,000 bear-case value.</small></li>
            </ol>
          </article>
        </div>
      </section>

      <section className="section" id="thesis">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 · TOP-DOWN FRAMEWORK</p>
            <h2>From trade recovery to earnings</h2>
          </div>
          <p>
            Each step is modelled separately so that trade value, physical
            container volume and company earnings are not treated as the same variable.
          </p>
        </div>

        <div className="chain-grid">
          {chain.map((item, index) => (
            <button
              key={item.title}
              className={activeChain === index ? "chain-node active" : "chain-node"}
              onClick={() => setActiveChain(index)}
            >
              <span>{item.kicker}</span>
              <strong>{item.title}</strong>
              <b>{item.value}</b>
              {index < chain.length - 1 && <i>→</i>}
            </button>
          ))}
        </div>
        <div className="chain-detail">
          <span>{chain[activeChain].kicker}</span>
          <strong>{chain[activeChain].title}</strong>
          <p>{chain[activeChain].description}</p>
          <div className="evidence-tags">
            <span>Fact</span>
            <span>Analyst assumption</span>
            <span>Model output</span>
          </div>
        </div>
      </section>

      <section className="section split-section" id="macro">
        <div>
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">02 · MACRO LENS</p>
              <h2>Trade value sets direction, not TEU</h2>
            </div>
          </div>
          <p className="body-copy">
            Merchandise trade reached USD 930bn in 2025. The model deliberately
            forecasts physical container growth below headline trade-value growth
            because prices, FX and product mix can break the relationship.
          </p>
          <div className="macro-callouts">
            <div>
              <span>1H2026 total trade</span>
              <strong>USD 549.69bn</strong>
              <em>+27.1% YoY</em>
            </div>
            <div>
              <span>1H2026 disbursed FDI</span>
              <strong>USD 13.03bn</strong>
              <em>+11.2% YoY</em>
            </div>
          </div>
        </div>
        <div className="panel chart-panel">
          <div className="panel-title">
            <div>
              <span>Vietnam merchandise trade</span>
              <strong>USD bn</strong>
            </div>
            <span className="source-chip">NSO official</span>
          </div>
          <div className="bar-chart macro-bars">
            {macroTrade.map((value, index) => (
              <button
                key={history.years[index]}
                className={selectedYear === index ? "bar-column selected" : "bar-column"}
                onClick={() => setSelectedYear(index)}
              >
                <span className="bar-value">{formatNumber(value, 1)}</span>
                <i style={{ height: `${(value / Math.max(...macroTrade)) * 100}%` }} />
                <b>{history.years[index].slice(0, 4)}</b>
              </button>
            ))}
          </div>
          <div className="chart-insight">
            <span>{history.years[selectedYear].slice(0, 4)}</span>
            <strong>USD {formatNumber(macroTrade[selectedYear], 2)}bn</strong>
            <p>
              {selectedYear === 4
                ? "Record trade value strengthens the setup, but does not guarantee equivalent container growth."
                : "Select another year to compare the trade cycle with GMD’s operating history."}
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="peers">
        <div className="section-heading">
          <div>
            <p className="eyebrow">03 · STOCK SELECTION</p>
            <h2>Why GMD is the preferred port exposure</h2>
          </div>
          <button
            className="text-button"
            onClick={() => setWeights(peerCriteria.map((criterion) => criterion.weight))}
          >
            Reset published weights
          </button>
        </div>

        <div className="peer-lab">
          <div className="panel weights-panel">
            {peerCriteria.map((criterion, index) => (
              <Slider
                key={criterion.label}
                label={criterion.short}
                value={weights[index]}
                min={0}
                max={40}
                step={1}
                suffix="%"
                onChange={(value) =>
                  setWeights((current) =>
                    current.map((weight, weightIndex) =>
                      weightIndex === index ? value : weight,
                    ),
                  )
                }
              />
            ))}
            <p className="panel-note">
              Weights auto-normalize. Scores remain visible analyst judgments from
              1 to 5; valuation is excluded from this operating screen.
            </p>
          </div>
          <div className="panel ranking-panel">
            <div className="panel-title">
              <div>
                <span>Dynamic ranking</span>
                <strong>{peerScores[0].ticker} ranks #1</strong>
              </div>
              <span className="source-chip">7 criteria</span>
            </div>
            <div className="peer-bars">
              {peerScores.map((peer, index) => (
                <div className="peer-bar-row" key={peer.ticker}>
                  <span>#{index + 1}</span>
                  <strong>{peer.ticker}</strong>
                  <div>
                    <i
                      className={peer.ticker === "GMD" ? "gmd-bar" : ""}
                      style={{ width: `${(peer.score / 5) * 100}%` }}
                    />
                  </div>
                  <b>{peer.score.toFixed(2)}</b>
                </div>
              ))}
            </div>
            <div className="selection-note">
              <strong>{peerScores[0].ticker === "GMD" ? "GMD remains selected" : `${peerScores[0].ticker} overtakes GMD`}</strong>
              <p>
                {peerScores[0].ticker === "GMD"
                  ? "Nationwide assets, capacity runway and disclosure keep GMD ahead under your current weighting."
                  : "Your weighting rejects the original selection. Revisit the operating thesis before carrying GMD into valuation."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="history">
        <div className="section-heading">
          <div>
            <p className="eyebrow">04 · HISTORICAL EVIDENCE</p>
            <h2>Five years of operating and earnings performance</h2>
          </div>
          <div className="segmented-control" aria-label="Historical metric">
            {(["Revenue", "Core PBT", "Throughput"] as HistoryMetric[]).map(
              (metric) => (
                <button
                  key={metric}
                  className={historyMetric === metric ? "active" : ""}
                  onClick={() => setHistoryMetric(metric)}
                >
                  {metric}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="history-grid">
          <div className="panel chart-panel history-panel">
            <div className="panel-title">
              <div>
                <span>{historyMetric}</span>
                <strong>{historyMetric === "Throughput" ? "m TEU" : "VND bn"}</strong>
              </div>
              <span className="source-chip">2021A–2025A</span>
            </div>
            <div className="bar-chart history-bars">
              {historyValues.map((value, index) => (
                <button
                  key={history.years[index]}
                  className={selectedYear === index ? "bar-column selected" : "bar-column"}
                  onClick={() => setSelectedYear(index)}
                >
                  <span className="bar-value">
                    {formatNumber(value, historyMetric === "Throughput" ? 2 : 0)}
                  </span>
                  <i style={{ height: `${(value / historyMax) * 100}%` }} />
                  <b>{history.years[index]}</b>
                </button>
              ))}
            </div>
          </div>
          <div className="history-facts">
            <div className="fact-card">
              <span>Revenue CAGR</span>
              <strong>16.7%</strong>
              <p>2021–2025</p>
            </div>
            <div className="fact-card amber">
              <span>Core PBT CAGR</span>
              <strong>33.0%</strong>
              <p>2021–2025</p>
            </div>
            <div className="fact-card green">
              <span>2025 system throughput</span>
              <strong>5.079m</strong>
              <p>17.9% CAGR since 2021</p>
            </div>
            <div className="fact-card red">
              <span>Associates / core PBT</span>
              <strong>45.9%</strong>
              <p>Revenue alone understates Gemalink</p>
            </div>
          </div>
        </div>
        <p className="footnote">
          Data limitation: 2021–2022 system-throughput values are chart-derived
          approximations and are identified separately from reported figures.
        </p>
      </section>

      <section className="section scenario-section" id="scenario">
        <div className="section-heading">
          <div>
            <p className="eyebrow">05 · FORECAST CASES</p>
            <h2>2026 operating assumptions</h2>
          </div>
          <div className="segmented-control scenario-tabs" aria-label="Scenario">
            {(["Base", "Bull", "Bear"] as const).map((key) => (
              <button
                key={key}
                className={scenario === key ? "active" : ""}
                onClick={() => selectScenario(key)}
              >
                {key}
              </button>
            ))}
            {scenario === "Custom" && <button className="active">Custom</button>}
          </div>
        </div>

        <div className="scenario-lab">
          <div className="panel scenario-inputs">
            <div className="panel-title">
              <div>
                <span>Operating assumptions</span>
                <strong>{scenario} case</strong>
              </div>
              <span className="source-chip assumption-chip">Editable</span>
            </div>
            <Slider
              label="National TEU growth"
              value={inputs.nationalGrowth}
              min={0}
              max={20}
              step={0.5}
              suffix="%"
              onChange={(value) => updateInput("nationalGrowth", value)}
            />
            <Slider
              label="GMD market share"
              value={inputs.marketShare}
              min={13}
              max={18}
              step={0.1}
              suffix="%"
              onChange={(value) => updateInput("marketShare", value)}
            />
            <Slider
              label="Unit / mix proxy growth"
              value={inputs.unitGrowth}
              min={-5}
              max={8}
              step={0.5}
              suffix="%"
              onChange={(value) => updateInput("unitGrowth", value)}
            />
            <Slider
              label="Operating margin"
              value={inputs.margin}
              min={22}
              max={34}
              step={0.5}
              suffix="%"
              onChange={(value) => updateInput("margin", value)}
            />
            <Slider
              label="Associate-profit growth"
              value={inputs.associateGrowth}
              min={-10}
              max={30}
              step={1}
              suffix="%"
              onChange={(value) => updateInput("associateGrowth", value)}
            />
            <Slider
              label="Cash capex"
              value={inputs.capex}
              min={700}
              max={2200}
              step={50}
              suffix="bn"
              onChange={(value) => updateInput("capex", value)}
            />
          </div>

          <div className="scenario-output-column">
            <div className="live-call">
              <div>
                <span>Live target price</span>
                <RatingBadge rating={outputs.rating} />
              </div>
              <strong>VND {formatNumber(outputs.target)}</strong>
              <em className={outputs.upside < 0 ? "negative" : ""}>
                {outputs.upside >= 0 ? "+" : ""}
                {(outputs.upside * 100).toFixed(1)}% vs current price
              </em>
            </div>
            <div className="output-grid">
              <div>
                <span>National TEU</span>
                <strong>{outputs.nationalTeu.toFixed(1)}m</strong>
              </div>
              <div>
                <span>GMD throughput</span>
                <strong>{outputs.gmdTeu.toFixed(2)}m</strong>
              </div>
              <div>
                <span>Revenue</span>
                <strong>{formatNumber(outputs.revenue)}bn</strong>
              </div>
              <div>
                <span>Core PBT</span>
                <strong>{formatNumber(outputs.corePbt)}bn</strong>
              </div>
              <div>
                <span>EPS</span>
                <strong>{formatNumber(outputs.eps)}</strong>
              </div>
              <div>
                <span>Parent PAT</span>
                <strong>{formatNumber(outputs.parentPat)}bn</strong>
              </div>
            </div>
            <div className="logic-trace">
              <span>LIVE MODEL TRACE</span>
              <p>
                {outputs.nationalTeu.toFixed(1)}m national TEU ×{" "}
                {inputs.marketShare.toFixed(1)}% share →{" "}
                {outputs.gmdTeu.toFixed(2)}m GMD TEU → VND{" "}
                {formatNumber(outputs.revenue)}bn revenue → VND{" "}
                {formatNumber(outputs.corePbt)}bn core PBT.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="valuation">
        <div className="section-heading">
          <div>
            <p className="eyebrow">06 · VALUATION</p>
            <h2>Target price and sensitivity</h2>
          </div>
          <p>
            DCF is a cross-check, not a single-point truth. Change WACC, terminal
            growth and P/E below.
          </p>
        </div>

        <div className="valuation-lab">
          <div className="panel valuation-controls">
            <Slider
              label="WACC"
              value={inputs.wacc}
              min={9}
              max={14}
              step={0.1}
              suffix="%"
              onChange={(value) => updateInput("wacc", value)}
            />
            <Slider
              label="Terminal growth"
              value={inputs.terminalGrowth}
              min={2}
              max={5}
              step={0.1}
              suffix="%"
              onChange={(value) => updateInput("terminalGrowth", value)}
            />
            <Slider
              label="Target 2026E P/E"
              value={inputs.pe}
              min={10}
              max={22}
              step={0.5}
              suffix="x"
              onChange={(value) => updateInput("pe", value)}
            />
            <div className="valuation-bridge">
              {[
                ["P/E implied", outputs.peValue],
                ["DCF / SOTP", outputs.dcfValue],
                ["Blended target", outputs.target],
              ].map(([label, rawValue]) => {
                const value = Number(rawValue);
                return (
                  <div key={String(label)}>
                    <span>{label}</span>
                    <i style={{ width: `${Math.min(100, (value / 130000) * 100)}%` }} />
                    <strong>{formatNumber(value)}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel sensitivity-panel">
            <div className="panel-title">
              <div>
                <span>DCF sensitivity</span>
                <strong>VND / share</strong>
              </div>
              <span className="source-chip">Live matrix</span>
            </div>
            <div className="sensitivity-table">
              <div className="sensitivity-head">WACC / TGR</div>
              {sensitivityRows.growths.map((growth) => (
                <div className="sensitivity-head" key={growth}>
                  {growth.toFixed(1)}%
                </div>
              ))}
              {sensitivityRows.waccs.flatMap((wacc, rowIndex) => [
                <div className="sensitivity-head" key={`w-${wacc}`}>
                  {wacc.toFixed(1)}%
                </div>,
                ...sensitivityRows.values[rowIndex].map((value, columnIndex) => (
                  <div
                    className={
                      rowIndex === 1 && columnIndex === 1
                        ? "sensitivity-cell center"
                        : "sensitivity-cell"
                    }
                    key={`${wacc}-${columnIndex}`}
                  >
                    {formatNumber(value)}
                  </div>
                )),
              ])}
            </div>
            <div className="valuation-warning">
              A 50bp change in either terminal assumption can move value by
              several thousand VND per share. Treat precision with caution.
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="risks">
        <div className="section-heading">
          <div>
            <p className="eyebrow">07 · RISKS & CATALYSTS</p>
            <h2>What changes the investment case</h2>
          </div>
          <div className="segmented-control">
            {(["Catalysts", "Falsifiers"] as const).map((view) => (
              <button
                key={view}
                className={riskView === view ? "active" : ""}
                onClick={() => setRiskView(view)}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
        <div className={`risk-board ${riskView === "Falsifiers" ? "danger" : ""}`}>
          {(riskView === "Catalysts"
            ? [
                ["2026", "Trade and FDI backdrop supports national container demand."],
                ["2026", "Nam Dinh Vu Phase 3 contributes for a full year and lifts Northern route flexibility."],
                ["Q4 2027", "Gemalink Phase 2 commissioning raises equity-accounted earnings from 2028."],
                ["Unit / mix", "Service and cargo mix lifts revenue per system TEU by 2.5%–3.0% annually."],
              ]
            : [
                ["Demand", "National TEU growth falls below 5% despite stronger trade value."],
                ["Share", "GMD market share drops below 14.8% as competing capacity absorbs growth."],
                ["Execution", "Gemalink Phase 2 slips beyond Q4 2027 or ramps below plan."],
                ["Cash", "Capex stays above VND 1.5tn and NCI leakage prevents parent cash conversion."],
              ]
          ).map(([time, text], index) => (
            <button key={text} className="risk-item">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <b>{time}</b>
                <p>{text}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="section" id="sources">
        <div className="section-heading">
          <div>
            <p className="eyebrow">08 · SOURCE EXPLORER</p>
            <h2>Sources and supporting evidence</h2>
          </div>
          <p>41 registered sources in the full Excel model. Key sources are searchable here.</p>
        </div>
        <div className="source-toolbar">
          <div className="segmented-control source-filters">
            {(["All", "Macro", "GMD", "Peers", "Market"] as SourceCategory[]).map(
              (category) => (
                <button
                  key={category}
                  className={sourceCategory === category ? "active" : ""}
                  onClick={() => setSourceCategory(category)}
                >
                  {category}
                </button>
              ),
            )}
          </div>
          <input
            type="search"
            placeholder="Search source ID, title or use…"
            value={sourceQuery}
            onChange={(event) => setSourceQuery(event.target.value)}
            aria-label="Search sources"
          />
        </div>
        <div className="source-list">
          {filteredSources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="source-row"
            >
              <span className="source-id">{source.id}</span>
              <div>
                <strong>{source.title}</strong>
                <p>{source.use}</p>
              </div>
              <span className="source-status">{source.status}</span>
              <b>↗</b>
            </a>
          ))}
          {filteredSources.length === 0 && (
            <div className="empty-state">No sources match this filter.</div>
          )}
        </div>
      </section>

      <section className="download-section" id="downloads">
        <div>
          <p className="eyebrow">Project files</p>
          <h2>Model and report downloads</h2>
          <p>
            The Excel model contains the operating forecast, valuation and source
            register. The report presents the investment case in a shorter format.
          </p>
        </div>
        <div className="download-grid">
          <a href="/downloads/02_GMD_Top_Down_Model.xlsx">
            <span>XLSX</span>
            <strong>Full research model</strong>
            <em>35 sheets · raw data · checks</em>
          </a>
          <a href="/downloads/GMD_Top_Down_Investment_Note.pdf">
            <span>PDF</span>
            <strong>7-slide investment note</strong>
            <em>Concise investment case and valuation</em>
          </a>
          <a href="/downloads/GMD_Top_Down_Investment_Note.pptx">
            <span>PPTX</span>
            <strong>Editable presentation</strong>
            <em>Sources in speaker notes</em>
          </a>
          <a href="/downloads/GMD_Top_Down_Interview_Script.md">
            <span>MD</span>
            <strong>Interview script</strong>
            <em>VN + EN pitches and Q&A</em>
          </a>
        </div>
      </section>

      <footer>
        <div>
          <strong>GMD · Interactive Equity Research</strong>
          <span>Public information, company disclosures and analyst estimates.</span>
        </div>
        <p>
          Educational portfolio project — not investment advice. Data cut-off:
          24 July 2026.
        </p>
      </footer>
    </main>
  );
}
