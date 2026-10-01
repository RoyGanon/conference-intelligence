import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const external = createRequire(import.meta.url);
const { renderToStaticMarkup } = external("react-dom/server");
function load(filename, overrides = {}) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "module", "exports", code)(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith(".") || name.startsWith("@/")) {
      const base = name.startsWith("@/") ? path.resolve("src", name.slice(2)) : path.resolve(path.dirname(filename), name);
      const candidate = [base + ".ts", base + ".tsx", path.join(base, "index.tsx")].find(fs.existsSync);
      return load(candidate, overrides);
    }
    return external(name);
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const { prepareConferenceDiscovery, filterDiscoveryConferences } = load(path.resolve("src/lib/conference-discovery-data.ts"));
const { assessTargetAudience } = load(path.resolve("src/lib/target-audience-fit.ts"));
const dataset = JSON.parse(fs.readFileSync("supabase/data/verified-conferences-2026-10-01.json", "utf8"));
function accepted(record) {
  const result = assessTargetAudience(record.targetAudienceAssessment, record.conference.acceptedEvidence);
  return { conference: record.conference, assessment: { input: record.targetAudienceAssessment, ...result },
    supportedScoreFloor: result.supportedScoreFloor, rubricVersion: result.rubricVersion,
    unresolvedFactors: result.unresolvedFactors, missingInputs: ["estimatedAudienceSize", "targetAudienceFit", "region"].filter(field => record.conference[field] === null) };
}
const records = dataset.records.map(accepted);
const items = records.map(prepareConferenceDiscovery);
const defaults = { search: "", vertical: "", region: "", tier: "" };
test("all eight researched conferences retain unknown inputs, floors and no ICP tiers", () => {
  assert.equal(items.length, 8);
  for (const item of items) { assert.equal(item.scoring, null); assert.equal(item.conference.targetAudienceFit, null); }
  assert.deepEqual(items.map(item => item.supportedScoreFloor), [90, 90, 60, 75, 85, 90, 55, 90]);
});
test("filters handle unknown geography, incomplete ICP and case/whitespace searches", () => {
  assert.equal(filterDiscoveryConferences(items, { ...defaults, tier: "A" }).length, 0);
  assert.equal(filterDiscoveryConferences(items, { ...defaults, tier: "incomplete" }).length, 8);
  assert.equal(filterDiscoveryConferences(items, { ...defaults, region: "unknown" }).length, 3);
  assert.equal(filterDiscoveryConferences(items, { ...defaults, search: "  LAS VEGAS " }).length, 2);
  assert.equal(filterDiscoveryConferences(items, { ...defaults, vertical: "travel" }).length, 1);
  assert.equal(filterDiscoveryConferences(items, { ...defaults, region: "benelux" }).length, 2);
});
test("only complete accepted assessments use existing scorer; zero remains a known input", () => {
  const record = structuredClone(records[0]);
  record.conference.region = "benelux"; record.conference.estimatedAudienceSize = 0; record.conference.targetAudienceFit = 90;
  record.missingInputs = []; record.assessment.complete = true;
  const item = prepareConferenceDiscovery(record);
  assert.equal(item.scoring.score, 80); assert.equal(item.scoring.tier, "A");
  assert.equal(item.scoring.breakdown.find(part => part.factor === "size").rawScore, 0);
  assert.equal(item.scoring.breakdown.some(part => part.reason.includes("synthetic fixture")), false);
  record.assessment.complete = false;
  assert.equal(prepareConferenceDiscovery(record).scoring, null);
});
test("real UI renders evidence, incomplete labels and no unsupported capture links", () => {
  const { ConferenceDiscovery } = load(path.resolve("src/components/conferences/conference-discovery.tsx"));
  const html = renderToStaticMarkup(external("react").createElement(ConferenceDiscovery, { conferences: items }));
  for (const text of ["Money20/20 USA 2026", "Unknown / not reliably published", "ICP incomplete", "Supported target audience floor", "Official source", "Accepted source evidence"]) assert.ok(html.includes(text));
  assert.equal(html.includes("/leads?conferenceId="), false);
  assert.equal(html.includes(">Tier A</span>"), false);
});
test("page reads on each request and renders unavailable without demo fallback", async () => {
  let reads = 0; let connections = 0;
  const { default: Page } = load(path.resolve("src/app/conferences/page.tsx"), {
    "next/server": { connection: async () => { connections++; } },
    "@/lib/conferences-server": { readAcceptedRealConferences: async () => { reads++; return { status: "unavailable", code: "upstream" }; } },
  });
  const html = renderToStaticMarkup(await Page());
  assert.equal(reads, 1); assert.equal(connections, 1);
  assert.ok(html.includes("Real conferences unavailable")); assert.ok(html.includes("Retry loading conferences"));
  assert.equal(html.includes("Money20/20 USA"), false);
});
test("available page uses real reader records; empty success has its own state", async () => {
  for (const conferences of [records, []]) {
    const { default: Page } = load(path.resolve("src/app/conferences/page.tsx"), {
      "next/server": { connection: async () => {} },
      "@/lib/conferences-server": { readAcceptedRealConferences: async () => ({ status: "available", conferences }) },
    });
    const html = renderToStaticMarkup(await Page());
    assert.ok(html.includes(conferences.length ? "Money20/20 USA 2026" : "No accepted real conferences"));
    assert.equal(html.includes("Real conferences unavailable"), false);
  }
});
