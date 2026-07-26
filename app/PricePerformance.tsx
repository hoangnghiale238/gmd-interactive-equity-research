"use client";

import { useEffect, useMemo, useState } from "react";

type RangeKey = "3M" | "6M" | "YTD" | "1Y" | "5Y";
type ChartMode = "Rebased" | "Price";

type PricePoint = {
  date: string;
  sourceDate: string;
  gmd: number;
  vnindex: number;
  gmdReturn: number | null;
  vnindexReturn: number | null;
  gmdRebased: number;
  vnindexRebased: number;
};

type PricePayload = {
  metadata: {
    fetched_at: string;
    weekly_rule: string;
    price_adjustment_note: string;
  };
  statistics: {
    regression_observations: number;
    raw_beta: number;
    adjusted_beta_blume: number;
    r_squared: number;
  };
  weekly: PricePoint[];
};

const RANGE_OPTIONS: RangeKey[] = ["3M", "6M", "YTD", "1Y", "5Y"];
const WIDTH = 960;
const HEIGHT = 390;
const MARGIN = { top: 24, right: 68, bottom: 46, left: 68 };
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatDate(value: string, compact = false) {
  return new Intl.DateTimeFormat("en-GB", {
    day: compact ? undefined : "2-digit",
    month: "short",
    year: compact ? "2-digit" : "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatReturn(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function paddedDomain(values: number[]) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = Math.max(maximum - minimum, Math.abs(maximum) * 0.08, 1);
  return [minimum - span * 0.1, maximum + span * 0.1] as const;
}

function pathFor(values: number[], domain: readonly [number, number]) {
  const [minimum, maximum] = domain;
  const denominator = Math.max(maximum - minimum, 0.0001);
  return values
    .map((value, index) => {
      const x =
        MARGIN.left +
        (values.length === 1 ? 0 : (index / (values.length - 1)) * PLOT_WIDTH);
      const y =
        MARGIN.top +
        (1 - (value - minimum) / denominator) * PLOT_HEIGHT;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function PricePerformance() {
  const [payload, setPayload] = useState<PricePayload | null>(null);
  const [range, setRange] = useState<RangeKey>("1Y");
  const [mode, setMode] = useState<ChartMode>("Rebased");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/data/gmd-price-performance.json")
      .then((response) => {
        if (!response.ok) throw new Error("Price data unavailable");
        return response.json() as Promise<PricePayload>;
      })
      .then((data) => {
        if (active) setPayload(data);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const points = useMemo(() => {
    if (!payload?.weekly.length) return [];
    const all = payload.weekly;
    const lastDate = new Date(`${all.at(-1)!.date}T00:00:00`);
    let cutoff = new Date(lastDate);

    if (range === "3M") cutoff.setMonth(cutoff.getMonth() - 3);
    if (range === "6M") cutoff.setMonth(cutoff.getMonth() - 6);
    if (range === "1Y") cutoff.setFullYear(cutoff.getFullYear() - 1);
    if (range === "YTD") cutoff = new Date(lastDate.getFullYear(), 0, 1);
    if (range === "5Y") return all;

    const filtered = all.filter(
      (point) => new Date(`${point.date}T00:00:00`) >= cutoff,
    );
    return filtered.length >= 2 ? filtered : all.slice(-2);
  }, [payload, range]);

  const chart = useMemo(() => {
    if (points.length < 2) return null;

    const first = points[0];
    const gmdRebased = points.map((point) => (point.gmd / first.gmd) * 100);
    const vnindexRebased = points.map(
      (point) => (point.vnindex / first.vnindex) * 100,
    );
    const gmdValues =
      mode === "Rebased" ? gmdRebased : points.map((point) => point.gmd);
    const vnindexValues =
      mode === "Rebased"
        ? vnindexRebased
        : points.map((point) => point.vnindex);
    const commonDomain =
      mode === "Rebased"
        ? paddedDomain([...gmdValues, ...vnindexValues])
        : null;
    const gmdDomain = commonDomain ?? paddedDomain(gmdValues);
    const vnindexDomain = commonDomain ?? paddedDomain(vnindexValues);
    const last = points.at(-1)!;
    const gmdReturn = (last.gmd / first.gmd - 1) * 100;
    const vnindexReturn = (last.vnindex / first.vnindex - 1) * 100;

    return {
      first,
      last,
      gmdValues,
      vnindexValues,
      gmdDomain,
      vnindexDomain,
      gmdPath: pathFor(gmdValues, gmdDomain),
      vnindexPath: pathFor(vnindexValues, vnindexDomain),
      gmdReturn,
      vnindexReturn,
      relativeReturn: gmdReturn - vnindexReturn,
    };
  }, [mode, points]);

  if (loadError) {
    return (
      <div className="panel performance-empty">
        Market-price data could not be loaded. The complete raw series remains
        available in the Excel model.
      </div>
    );
  }

  if (!payload || !chart) {
    return <div className="panel performance-empty">Loading market performance…</div>;
  }

  const activeIndex = hoverIndex ?? points.length - 1;
  const activePoint = points[activeIndex];
  const activeX =
    MARGIN.left +
    (activeIndex / Math.max(points.length - 1, 1)) * PLOT_WIDTH;
  const gmdValue = chart.gmdValues[activeIndex];
  const vnindexValue = chart.vnindexValues[activeIndex];
  const gmdY =
    MARGIN.top +
    (1 -
      (gmdValue - chart.gmdDomain[0]) /
        (chart.gmdDomain[1] - chart.gmdDomain[0])) *
      PLOT_HEIGHT;
  const vnindexY =
    MARGIN.top +
    (1 -
      (vnindexValue - chart.vnindexDomain[0]) /
        (chart.vnindexDomain[1] - chart.vnindexDomain[0])) *
      PLOT_HEIGHT;
  const xTickIndexes = Array.from(
    new Set(
      Array.from({ length: 6 }, (_, index) =>
        Math.round((index / 5) * (points.length - 1)),
      ),
    ),
  );
  const yTicks = Array.from({ length: 5 }, (_, index) => index / 4);
  const tooltipX = clamp(activeX + 14, MARGIN.left + 8, WIDTH - 234);

  return (
    <div className="performance-module">
      <div className="performance-controls">
        <div className="segmented-control" aria-label="Performance period">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              className={range === option ? "active" : ""}
              onClick={() => {
                setRange(option);
                setHoverIndex(null);
              }}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="segmented-control" aria-label="Chart display">
          {(["Rebased", "Price"] as ChartMode[]).map((option) => (
            <button
              key={option}
              className={mode === option ? "active" : ""}
              onClick={() => setMode(option)}
            >
              {option === "Rebased" ? "Rebased to 100" : "Price levels"}
            </button>
          ))}
        </div>
      </div>

      <div className="performance-kpis">
        <article>
          <span>GMD return</span>
          <strong className={chart.gmdReturn >= 0 ? "positive" : "negative"}>
            {formatReturn(chart.gmdReturn)}
          </strong>
          <small>{formatDate(chart.first.date)} – {formatDate(chart.last.date)}</small>
        </article>
        <article>
          <span>VN-Index return</span>
          <strong className={chart.vnindexReturn >= 0 ? "positive" : "negative"}>
            {formatReturn(chart.vnindexReturn)}
          </strong>
          <small>Same weekly-close window</small>
        </article>
        <article>
          <span>Relative performance</span>
          <strong className={chart.relativeReturn >= 0 ? "positive" : "negative"}>
            {formatReturn(chart.relativeReturn)}
          </strong>
          <small>GMD return less VN-Index</small>
        </article>
      </div>

      <div className="panel performance-chart-panel">
        <div className="performance-legend">
          <span><i className="legend-gmd" />GMD</span>
          <span><i className="legend-index" />VN-Index</span>
          <em>{mode === "Rebased" ? "Comparable price performance" : "Dual price axes"}</em>
        </div>
        <svg
          className="performance-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={`GMD and VN-Index ${mode === "Rebased" ? "rebased performance" : "price levels"}`}
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            const svgX = ((event.clientX - bounds.left) / bounds.width) * WIDTH;
            const ratio = clamp((svgX - MARGIN.left) / PLOT_WIDTH, 0, 1);
            setHoverIndex(Math.round(ratio * (points.length - 1)));
          }}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {yTicks.map((ratio) => {
            const y = MARGIN.top + ratio * PLOT_HEIGHT;
            const vnValue =
              chart.vnindexDomain[1] -
              ratio * (chart.vnindexDomain[1] - chart.vnindexDomain[0]);
            const gmdAxisValue =
              chart.gmdDomain[1] -
              ratio * (chart.gmdDomain[1] - chart.gmdDomain[0]);
            return (
              <g key={ratio}>
                <line className="chart-gridline" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y} y2={y} />
                <text className="chart-axis-label" x={MARGIN.left - 12} y={y + 4} textAnchor="end">
                  {vnValue.toFixed(0)}
                </text>
                {mode === "Price" && (
                  <text className="chart-axis-label chart-axis-gmd" x={WIDTH - MARGIN.right + 12} y={y + 4}>
                    {gmdAxisValue.toFixed(0)}
                  </text>
                )}
              </g>
            );
          })}

          {xTickIndexes.map((index) => {
            const x =
              MARGIN.left +
              (index / Math.max(points.length - 1, 1)) * PLOT_WIDTH;
            return (
              <g key={`${points[index].date}-${index}`}>
                <line className="chart-tick" x1={x} x2={x} y1={HEIGHT - MARGIN.bottom} y2={HEIGHT - MARGIN.bottom + 6} />
                <text className="chart-axis-label" x={x} y={HEIGHT - 18} textAnchor="middle">
                  {formatDate(points[index].date, true)}
                </text>
              </g>
            );
          })}

          <path className="performance-line index-line" d={chart.vnindexPath} />
          <path className="performance-line gmd-line" d={chart.gmdPath} />

          <line className="hover-line" x1={activeX} x2={activeX} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} />
          <circle className="hover-dot gmd-dot" cx={activeX} cy={gmdY} r="5" />
          <circle className="hover-dot index-dot" cx={activeX} cy={vnindexY} r="4.5" />

          <g className="chart-tooltip" transform={`translate(${tooltipX} 38)`}>
            <rect width="218" height="94" rx="10" />
            <text x="14" y="22" className="tooltip-date">{formatDate(activePoint.date)}</text>
            <text x="14" y="49" className="tooltip-gmd">GMD</text>
            <text x="204" y="49" textAnchor="end">
              {mode === "Rebased" ? gmdValue.toFixed(1) : `${activePoint.gmd.toFixed(2)}k`}
            </text>
            <text x="14" y="75" className="tooltip-index">VN-Index</text>
            <text x="204" y="75" textAnchor="end">
              {mode === "Rebased" ? vnindexValue.toFixed(1) : activePoint.vnindex.toFixed(2)}
            </text>
          </g>
        </svg>
        <div className="performance-chart-notes">
          <span>Left axis: {mode === "Rebased" ? "both series, start = 100" : "VN-Index points"}</span>
          <span>{mode === "Price" ? "Right axis: GMD (VND '000/share)" : "Hover or tap to inspect each week"}</span>
        </div>
      </div>

      <div className="beta-strip">
        <div>
          <span>5Y weekly raw beta</span>
          <strong>{payload.statistics.raw_beta.toFixed(2)}x</strong>
        </div>
        <div>
          <span>Blume-adjusted beta</span>
          <strong>{payload.statistics.adjusted_beta_blume.toFixed(2)}x</strong>
        </div>
        <div>
          <span>Regression R²</span>
          <strong>{(payload.statistics.r_squared * 100).toFixed(1)}%</strong>
        </div>
        <p>
          {payload.statistics.regression_observations} aligned weekly returns.
          The valuation keeps a 0.95x Base beta as a conservative overlay; the
          raw regression and complete price history are linked in the Excel model.
        </p>
      </div>

      <p className="footnote performance-footnote">
        Source: VNStock Quote API, VCI data source. Weekly series uses the last
        available close in each Friday-ended week. The API response did not
        provide a separate adjusted-close field.
      </p>
    </div>
  );
}
