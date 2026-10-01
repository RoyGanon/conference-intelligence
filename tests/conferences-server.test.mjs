import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const external = createRequire(import.meta.url);
function load(filename) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function("require", "module", "exports", code)(name => name === "server-only" ? {} : name.startsWith(".")
    ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : external(name), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const server = load(path.resolve("src/lib/conferences-server.ts"));
const { assessTargetAudience } = load(path.resolve("src/lib/target-audience-fit.ts"));
const dataset = JSON.parse(fs.readFileSync("supabase/data/verified-conferences-2026-10-01.json", "utf8"));
function row(record = dataset.records[5]) {
  return { ...Object.fromEntries(Object.entries(record.conference).map(([key, value]) => [key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`), value])),
    target_audience_assessment: { input: record.targetAudienceAssessment, result: assessTargetAudience(record.targetAudienceAssessment, record.conference.acceptedEvidence) } };
}
const options = { url: "https://example.supabase.co", key: "sb_secret_test" };
const response = data => new Response(JSON.stringify(data));
test("reader validates five completed audience reviews while retaining three incomplete assessments", async () => {
  const result = await server.readAcceptedRealConferences({ ...options, fetcher: async () => response(dataset.records.map(row)) });
  assert.equal(result.status, "available");
  assert.deepEqual(result.conferences.map(r => r.assessment.complete), [true, true, true, true, true, false, false, false]);
  assert.deepEqual(result.conferences.map(r => r.conference.targetAudienceFit), [100, 100, 100, 100, 100, null, null, null]);
  assert.equal(result.conferences.filter(r => r.missingInputs.length === 0).length, 1);
});
test("server reader preserves accepted facts, unknown inputs and evidence-linked floor", async () => {
  const result = await server.readAcceptedRealConferences({ ...options, fetcher: async (url, init) => {
    assert.equal(init.method, "GET"); assert.equal(init.cache, "no-store"); assert.equal(init.redirect, "error");
    assert.equal(init.headers.apikey, options.key); assert.equal(init.headers.Authorization, undefined);
    assert.equal(url.searchParams.get("is_demo"), "eq.false"); assert.equal(url.searchParams.get("last_verified_at"), "not.is.null");
    return response([{ ...row(), lifecycle_status: "cancelled", needs_review: true, review_reason: "Source conflict" }]);
  } });
  assert.equal(result.status, "available");
  const item = result.conferences[0];
  assert.equal(item.conference.lifecycleStatus, "cancelled"); assert.equal(item.conference.needsReview, true);
  assert.equal(item.supportedScoreFloor, 90); assert.equal(item.conference.targetAudienceFit, null);
  assert.equal(item.rubricVersion, "grain-target-audience-v1"); assert.equal(item.unresolvedFactors[0].factor, "relevance");
});
test("invalid, demo and tampered records never become real data", async () => {
  for (const change of [{ is_demo: true }, { last_verified_at: null }, { target_audience_fit: 90 }, { target_audience_assessment: { input: {}, result: {} } }]) {
    const result = await server.readAcceptedRealConferences({ ...options, fetcher: async () => response([{ ...row(), ...change }]) });
    assert.equal(result.status, "unavailable"); assert.equal(result.code, "invalid_data");
  }
});
test("absent assessment stays unknown; JSONB key ordering does not affect verification", async () => {
  const first = row(); first.target_audience_assessment.result = Object.fromEntries(Object.entries(first.target_audience_assessment.result).reverse());
  for (const record of [first, { ...row(), target_audience_assessment: null }]) {
    const result = await server.readAcceptedRealConferences({ ...options, fetcher: async () => response([record]) });
    assert.equal(result.status, "available");
    if (record.target_audience_assessment === null) assert.equal(result.conferences[0].supportedScoreFloor, null);
  }
});
test("unavailable/configuration states never expose upstream errors or credentials", async () => {
  const unavailable = await server.readAcceptedRealConferences({ ...options, fetcher: async () => { throw new Error(options.key); } });
  assert.equal(unavailable.status, "unavailable"); assert.equal(JSON.stringify(unavailable).includes(options.key), false);
  assert.equal((await server.readAcceptedRealConferences({ url: "", key: "" })).code, "not_configured");
  assert.equal((await server.readAcceptedRealConferences({ ...options, url: "http://example.org" })).code, "configuration");
  const timed = await server.readAcceptedRealConferences({ ...options, timeoutMs: 1, fetcher: async (_, init) => new Promise((resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("timeout")))) });
  assert.equal(timed.code, "timeout");
});
test("readiness checks all tables and expected IDs without writes; legacy JWT uses bearer", async () => {
  const ids = [row().id];
  const result = await server.checkConferencesReadiness({ ...options, key: "legacy.jwt", fetcher: async (url, init) => {
    assert.equal(init.headers.Authorization, "Bearer legacy.jwt"); assert.equal(init.method, "GET");
    return response(url.searchParams.get("limit") === "0" ? [] : [row()]);
  } }, ids);
  assert.equal(result.ready, true); assert.equal(result.tables.length, 5);
  const missing = await server.checkConferencesReadiness({ ...options, fetcher: async url => url.pathname.endsWith("conference_observations") ? new Response("private", { status: 400 }) : response([]) }, ids);
  assert.equal(missing.ready, false); assert.equal(missing.schemaCompatible, false); assert.deepEqual(missing.missingIds, ids);
});
