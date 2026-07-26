import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the published GMD research case", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>GMD — Interactive Equity Research<\/title>/i);
  assert.match(html, /GMD: Export Recovery Meets Scarce Port Capacity/);
  assert.match(html, /Bear \/ Bull/);
  assert.match(html, /51,000 \/ 115,500/);
  assert.match(html, /How the report builds the case/);
  assert.match(html, /4 catalysts/);
  assert.match(html, /4 downside triggers/);
  assert.doesNotMatch(html, /3 thesis|3 risks/i);
});

test("uses the supplied Gemadept hero and report scenario targets", async () => {
  const [dashboard, css] = await Promise.all([
    readFile(new URL("../app/ResearchDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    access(new URL("../public/hero-gemadept.jpg", import.meta.url)),
  ]);

  assert.match(css, /url\(["']\/hero-gemadept\.jpg["']\)/);
  assert.match(css, /padding:\s*390px/);
  assert.match(dashboard, /Base:\s*84_500/);
  assert.match(dashboard, /Bull:\s*115_500/);
  assert.match(dashboard, /Bear:\s*51_000/);
});

test("ships the VNStock price-performance and beta evidence", async () => {
  const [dashboard, chart, css, rawData] = await Promise.all([
    readFile(new URL("../app/ResearchDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/PricePerformance.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL("../public/data/gmd-price-performance.json", import.meta.url),
      "utf8",
    ),
  ]);
  const data = JSON.parse(rawData);

  assert.match(dashboard, /id="performance"/);
  assert.match(chart, /Since initiation/);
  assert.match(chart, /useState<ChartMode>\("price"\)/);
  assert.match(chart, /Rebased to 100/);
  assert.match(chart, /Price levels/);
  assert.match(chart, /percentage points/);
  assert.match(chart, /performance-crosshair/);
  assert.match(chart, /performance-floating-tooltip/);
  assert.match(chart, /combinedRebasedValues/);
  assert.match(chart, /sharedRebasedRange\s*\?\?/);
  const genericPanelRule = css.lastIndexOf(".site.light-theme .panel,");
  const darkPanelOverride = css.lastIndexOf(
    ".site.light-theme .panel.performance-panel",
  );
  assert.ok(darkPanelOverride > genericPanelRule);
  assert.match(
    css.slice(darkPanelOverride),
    /background:\s*#101010/,
  );
  assert.equal(data.weekly.length, 259);
  assert.equal(data.statistics.regression_observations, 258);
  assert.ok(data.statistics.raw_beta > 0.7);
  assert.ok(data.statistics.raw_beta < 0.8);
});
