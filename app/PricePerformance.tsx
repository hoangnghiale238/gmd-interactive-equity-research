"use client";

import { useEffect, useMemo, useState } from "react";

type RangeKey = "3m" | "6m" | "ytd" | "1y" | "since";
type ChartMode = "price" | "rebased";

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

type PlotPoint = PricePoint & {
  timestamp: number;
  gmdValue: number;
  indexValue: number;
};

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1Y" },
  { key: "since", label: "Since initiation" },
];

const WIDTH = 1100;
const HEIGHT = 360;
const PAD = { left: 78, right: 84, top: 16, bottom: 66 };
const PLOT_WIDTH = WIDTH - PAD.left - PAD.right;
const PLOT_HEIGHT = HEIGHT - PAD.top - PAD.bottom;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function signedPercentagePoints(value: number) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} percentage points`;
}

function priceRange(values: number[], rebased: boolean) {
  const rawMinimum = Math.min(...values);
  const rawMaximum = Math.max(...values);
  const padding = Math.max(
    (rawMaximum - rawMinimum) * 0.1,
    rebased ? 3 : rawMaximum * 0.04,
  );
  return {
    minimum: rawMinimum - padding,
    maximum: rawMaximum + padding,
  };
}

function linePath(
  rows: PlotPoint[],
  field: "gmdValue" | "indexValue",
  range: { minimum: number; maximum: number },
) {
  const firstTimestamp = rows[0].timestamp;
  const lastTimestamp = rows.at(-1)!.timestamp;
  const timeSpan = Math.max(lastTimestamp - firstTimestamp, 1);
  const valueSpan = Math.max(range.maximum - range.minimum, 0.0001);

  return rows
    .map((row, index) => {
      const x =
        PAD.left +
        ((row.timestamp - firstTimestamp) / timeSpan) * PLOT_WIDTH;
      const y =
        PAD.top +
        ((range.maximum - row[field]) / valueSpan) * PLOT_HEIGHT;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function PricePerformance() {
  const [payload, setPayload] = useState<PricePayload | null>(null);
  const [range, setRange] = useState<RangeKey>("1y");
  const [mode, setMode] = useState<ChartMode>("price");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0 });
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

  const selectedRows = useMemo(() => {
    if (!payload?.weekly.length) return [];

    const rows = payload.weekly
      .map((row) => ({
        ...row,
        timestamp: new Date(`${row.date}T12:00:00`).getTime(),
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    if (range === "since") return rows;

    const cutoff = new Date(rows.at(-1)!.timestamp);
    if (range === "3m") cutoff.setMonth(cutoff.getMonth() - 3);
    if (range === "6m") cutoff.setMonth(cutoff.getMonth() - 6);
    if (range === "1y") cutoff.setFullYear(cutoff.getFullYear() - 1);
    if (range === "ytd") cutoff.setMonth(0, 1);

    const filtered = rows.filter((row) => row.timestamp >= cutoff.getTime());
    return filtered.length >= 2 ? filtered : rows;
  }, [payload, range]);

  const chart = useMemo(() => {
    if (selectedRows.length < 2) return null;

    const rebased = mode === "rebased";
    const first = selectedRows[0];
    const last = selectedRows.at(-1)!;
    const rows: PlotPoint[] = selectedRows.map((row) => ({
      ...row,
      gmdValue: rebased ? (row.gmd / first.gmd) * 100 : row.gmd,
      indexValue: rebased ? (row.vnindex / first.vnindex) * 100 : row.vnindex,
    }));
    const combinedRebasedValues = rows.flatMap((row) => [
      row.gmdValue,
      row.indexValue,
    ]);
    const sharedRebasedRange = rebased
      ? priceRange(combinedRebasedValues, true)
      : null;
    const indexRange =
      sharedRebasedRange ??
      priceRange(
        rows.map((row) => row.indexValue),
        false,
      );
    const gmdRange =
      sharedRebasedRange ??
      priceRange(
        rows.map((row) => row.gmdValue),
        false,
      );
    const gmdReturn = last.gmd / first.gmd - 1;
    const indexReturn = last.vnindex / first.vnindex - 1;

    return {
      rows,
      first,
      last,
      rebased,
      indexRange,
      gmdRange,
      gmdPath: linePath(rows, "gmdValue", gmdRange),
      indexPath: linePath(rows, "indexValue", indexRange),
      gmdReturn,
      indexReturn,
      relativeReturn: gmdReturn - indexReturn,
    };
  }, [mode, selectedRows]);

  if (loadError) {
    return (
      <article className="panel performance-panel performance-empty">
        Market-price data could not be loaded. The complete raw series remains
        available in the Excel model.
      </article>
    );
  }

  if (!payload || !chart) {
    return (
      <article className="panel performance-panel performance-empty">
        Loading weekly market data
      </article>
    );
  }

  const firstTimestamp = chart.rows[0].timestamp;
  const lastTimestamp = chart.rows.at(-1)!.timestamp;
  const timeSpan = Math.max(lastTimestamp - firstTimestamp, 1);
  const xForTimestamp = (timestamp: number) =>
    PAD.left + ((timestamp - firstTimestamp) / timeSpan) * PLOT_WIDTH;
  const yForValue = (
    value: number,
    axisRange: { minimum: number; maximum: number },
  ) =>
    PAD.top +
    ((axisRange.maximum - value) /
      Math.max(axisRange.maximum - axisRange.minimum, 0.0001)) *
      PLOT_HEIGHT;

  const activeIndex = hoverIndex ?? chart.rows.length - 1;
  const activePoint = chart.rows[activeIndex];
  const activeX = xForTimestamp(activePoint.timestamp);
  const gmdY = yForValue(activePoint.gmdValue, chart.gmdRange);
  const indexY = yForValue(activePoint.indexValue, chart.indexRange);
  const horizontalTicks = Array.from({ length: 5 }, (_, index) => index / 4);
  const dateTickRatios =
    chart.rows.length > 20 ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.33, 0.67, 1];
  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.key === range)?.label ?? "1Y";

  const selectRange = (key: RangeKey) => {
    setRange(key);
    setHoverIndex(null);
    setTooltip((current) => ({ ...current, visible: false }));
  };

  const selectMode = (key: ChartMode) => {
    setMode(key);
    setHoverIndex(null);
    setTooltip((current) => ({ ...current, visible: false }));
  };

  return (
    <article className="panel performance-panel">
      <div className="performance-panel-head">
        <div>
          <p className="eyebrow">Market performance</p>
          <h3>GMD share price vs VN-Index</h3>
        </div>
        <div className="performance-control-stack">
          <div className="performance-range-controls" role="group" aria-label="Performance period">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                className={range === option.key ? "performance-range active" : "performance-range"}
                aria-pressed={range === option.key}
                onClick={() => selectRange(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="performance-mode-controls" role="group" aria-label="Chart view">
            <button
              className={mode === "price" ? "performance-mode active" : "performance-mode"}
              aria-pressed={mode === "price"}
              onClick={() => selectMode("price")}
            >
              Price levels
            </button>
            <button
              className={mode === "rebased" ? "performance-mode active" : "performance-mode"}
              aria-pressed={mode === "rebased"}
              onClick={() => selectMode("rebased")}
            >
              Rebased to 100
            </button>
          </div>
        </div>
      </div>

      <div className="performance-summary" aria-live="polite">
        <article>
          <span>GMD return</span>
          <strong>{signedPercent(chart.gmdReturn)}</strong>
        </article>
        <article>
          <span>VN-Index return</span>
          <strong>{signedPercent(chart.indexReturn)}</strong>
        </article>
        <article>
          <span>Relative performance</span>
          <strong className={chart.relativeReturn >= 0 ? "positive" : "negative"}>
            {signedPercentagePoints(chart.relativeReturn)}
          </strong>
        </article>
      </div>

      <div className="performance-legend" aria-label="Chart legend">
        <span><i className="legend-line gmd" />GMD</span>
        <span><i className="legend-line vnindex" />VN-Index</span>
      </div>

      <div className="price-performance-chart" aria-label="Weekly GMD share price and VN-Index performance">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img">
          <title>GMD share price and VN-Index performance</title>
          <desc>
            {rangeLabel} return: GMD {signedPercent(chart.gmdReturn)}, VN-Index{" "}
            {signedPercent(chart.indexReturn)}, relative{" "}
            {signedPercentagePoints(chart.relativeReturn)}.
          </desc>

          {horizontalTicks.map((ratio) => {
            const gridY = PAD.top + ratio * PLOT_HEIGHT;
            const indexTick =
              chart.indexRange.maximum -
              ratio * (chart.indexRange.maximum - chart.indexRange.minimum);
            const gmdTick =
              chart.gmdRange.maximum -
              ratio * (chart.gmdRange.maximum - chart.gmdRange.minimum);
            return (
              <g key={ratio}>
                <line
                  x1={PAD.left}
                  y1={gridY}
                  x2={WIDTH - PAD.right}
                  y2={gridY}
                  className="performance-gridline"
                />
                <text x={PAD.left - 12} y={gridY + 4} textAnchor="end" className="axis">
                  {indexTick.toFixed(0)}
                </text>
                {!chart.rebased && (
                  <text x={WIDTH - PAD.right + 12} y={gridY + 4} className="axis">
                    {gmdTick.toFixed(1)}k
                  </text>
                )}
              </g>
            );
          })}

          {dateTickRatios.map((ratio) => {
            const targetTimestamp = firstTimestamp + ratio * timeSpan;
            const nearest = chart.rows.reduce((best, row) =>
              Math.abs(row.timestamp - targetTimestamp) <
              Math.abs(best.timestamp - targetTimestamp)
                ? row
                : best,
            );
            const tickX = xForTimestamp(nearest.timestamp);
            return (
              <g key={`${nearest.date}-${ratio}`}>
                <line
                  x1={tickX}
                  y1={HEIGHT - PAD.bottom}
                  x2={tickX}
                  y2={HEIGHT - PAD.bottom + 6}
                  className="performance-date-tick"
                />
                <text
                  x={tickX}
                  y={HEIGHT - 24}
                  textAnchor="middle"
                  className="axis"
                >
                  {formatDate(nearest.timestamp)}
                </text>
              </g>
            );
          })}

          <text
            x={18}
            y={PAD.top + PLOT_HEIGHT / 2}
            transform={`rotate(-90 18 ${PAD.top + PLOT_HEIGHT / 2})`}
            textAnchor="middle"
            className="axis"
          >
            {chart.rebased ? "Rebased performance" : "VN-Index"}
          </text>
          {!chart.rebased && (
            <text
              x={WIDTH - 18}
              y={PAD.top + PLOT_HEIGHT / 2}
              transform={`rotate(90 ${WIDTH - 18} ${PAD.top + PLOT_HEIGHT / 2})`}
              textAnchor="middle"
              className="axis"
            >
              GMD price (VND &apos;000)
            </text>
          )}

          <path
            key={`index-${range}-${mode}`}
            d={chart.indexPath}
            pathLength="1"
            className="performance-series performance-series-index"
          />
          <path
            key={`gmd-${range}-${mode}`}
            d={chart.gmdPath}
            pathLength="1"
            className="performance-series performance-series-gmd"
          />

          <line
            x1={activeX}
            x2={activeX}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
            className={tooltip.visible ? "performance-crosshair visible" : "performance-crosshair"}
          />
          <circle
            cx={activeX}
            cy={indexY}
            r="5"
            className={tooltip.visible ? "performance-hover-dot index visible" : "performance-hover-dot index"}
          />
          <circle
            cx={activeX}
            cy={gmdY}
            r="5.5"
            className={tooltip.visible ? "performance-hover-dot gmd visible" : "performance-hover-dot gmd"}
          />

          <rect
            x={PAD.left}
            y={PAD.top}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            className="performance-hover-overlay"
            onPointerMove={(event) => {
              const bounds = event.currentTarget.ownerSVGElement!.getBoundingClientRect();
              const localX =
                ((event.clientX - bounds.left) / bounds.width) * WIDTH;
              const targetTimestamp =
                firstTimestamp +
                clamp((localX - PAD.left) / PLOT_WIDTH, 0, 1) * timeSpan;
              const nearestIndex = chart.rows.reduce(
                (bestIndex, row, index) =>
                  Math.abs(row.timestamp - targetTimestamp) <
                  Math.abs(chart.rows[bestIndex].timestamp - targetTimestamp)
                    ? index
                    : bestIndex,
                0,
              );
              setHoverIndex(nearestIndex);
              setTooltip({
                visible: true,
                x: clamp(event.clientX + 14, 8, window.innerWidth - 222),
                y: clamp(event.clientY - 12, 8, window.innerHeight - 116),
              });
            }}
            onPointerLeave={() => {
              setHoverIndex(null);
              setTooltip((current) => ({ ...current, visible: false }));
            }}
            onPointerCancel={() => {
              setHoverIndex(null);
              setTooltip((current) => ({ ...current, visible: false }));
            }}
          />
        </svg>
      </div>

      <div className="performance-footnote">
        <span>
          {rangeLabel} | Weekly Friday close | {formatDate(chart.first.timestamp)} to{" "}
          {formatDate(chart.last.timestamp)} | Relative performance = GMD return
          − VN-Index return (percentage points).
        </span>
        <span>Hover across the chart to inspect a weekly Friday close.</span>
      </div>

      <div
        className={tooltip.visible ? "performance-floating-tooltip visible" : "performance-floating-tooltip"}
        style={{ left: tooltip.x, top: tooltip.y }}
        aria-hidden={!tooltip.visible}
      >
        <b>{formatDate(activePoint.timestamp)}</b>
        <span className="tooltip-index">
          VN-Index:{" "}
          {chart.rebased
            ? `${activePoint.indexValue.toFixed(1)} (index)`
            : activePoint.vnindex.toFixed(0)}
        </span>
        <span className="tooltip-gmd">
          GMD:{" "}
          {chart.rebased
            ? `${activePoint.gmdValue.toFixed(1)} (index)`
            : `${activePoint.gmd.toFixed(2)}k VND`}
        </span>
      </div>
    </article>
  );
}
