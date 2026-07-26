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
