import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const external = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function load(file) {
  const filename = path.resolve(root, file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(name => name.startsWith(".")
    ? load(path.relative(root, path.resolve(path.dirname(filename), `${name}.ts`))) : external(name), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const contracts = load("src/lib/conference-data.ts");
const { conferenceSchema } = load("src/lib/schemas.ts");
const { demoConferences } = load("src/lib/demo-fixtures.ts");
const now = "2026-10-01T10:00:00Z";
const base = { ...demoConferences[0], editionKey: null, lifecycleStatus: "scheduled", needsReview: false,
  reviewReason: null, sourceUrl: null, sourceName: null, lastCheckedAt: null, lastVerifiedAt: null,
  acceptedEvidence: {}, updatedAt: now, revision: 1 };
test("fixture runtime contract is unchanged; stored demo records need no invented evidence", () => {
  for (const conference of demoConferences) assert.deepEqual(conferenceSchema.parse(conference), conference);
  assert.equal(contracts.storedConferenceSchema.parse(base).id, demoConferences[0].id);
  assert.equal(conferenceSchema.safeParse({ ...demoConferences[0], region: null }).success, false);
});
test("real records accept unknown inputs but require edition identity and source", () => {
  const real = { ...base, isDemo: false, editionKey: "organizer:event:2027", sourceUrl: "https://example.org/event/2027",
    sourceName: "Organizer", region: null, estimatedAudienceSize: null, targetAudienceFit: null };
  assert.equal(contracts.storedConferenceSchema.safeParse(real).success, true);
  for (const change of [{ sourceUrl: null }, { editionKey: null }, { sourceUrl: "file:///secret" },
    { estimatedAudienceSize: -1 }, { targetAudienceFit: 101 }, { endDate: "2020-01-01" }]) {
    assert.equal(contracts.storedConferenceSchema.safeParse({ ...real, ...change }).success, false);
  }
});
test("review is independent of lifecycle and requires explanation", () => {
  for (const lifecycleStatus of ["scheduled", "changed", "cancelled"]) {
    assert.equal(contracts.storedConferenceSchema.safeParse({ ...base, lifecycleStatus, needsReview: true, reviewReason: "Conflicting sources" }).success, true);
  }
  assert.equal(contracts.storedConferenceSchema.safeParse({ ...base, needsReview: true }).success, false);
});
test("observations support incomplete discoveries and failed checks without accepting them", () => {
  const observation = { id: crypto.randomUUID(), conferenceId: null, editionKey: "event:2027",
    sourceUrl: "https://example.org/events", sourceName: "Organizer", checkedAt: now, verifiedAt: null,
    fetchStatus: "failed", contentHash: null, evidence: [], extractedFacts: {}, proposedChanges: {},
    issues: ["Request timed out"], reviewState: "pending", reviewedAt: null };
  assert.equal(contracts.conferenceObservationSchema.safeParse(observation).success, true);
  assert.equal(contracts.conferenceObservationSchema.safeParse({ ...observation, reviewState: "accepted" }).success, false);
  assert.equal(contracts.conferenceFactsSchema.safeParse({ attendanceStatus: "planned" }).success, false);
  assert.equal(contracts.conferenceFactsSchema.safeParse({ startDate: "2027-01-05", endDate: "2027-01-04" }).success, false);
  assert.equal(contracts.conferenceEvidenceSchema.safeParse({ sourceUrl: "https://example.org", sourceName: "Organizer", checkedAt: now, excerpt: "Event dates" }).success, true);
});
test("run contracts validate paired leases, counts, and timestamp instants", () => {
  const run = { id: crypto.randomUUID(), startedAt: now, finishedAt: null, status: "running", counts: {}, errors: [], cursor: {}, leaseKey: null, leaseExpiresAt: null };
  assert.equal(contracts.conferenceResearchRunSchema.safeParse(run).success, true);
  assert.equal(contracts.conferenceResearchRunSchema.safeParse({ ...run, leaseKey: "research" }).success, false);
  assert.equal(contracts.conferenceResearchRunSchema.safeParse({ ...run, counts: { checked: -1 } }).success, false);
  assert.equal(contracts.conferenceResearchRunSchema.safeParse({ ...run, finishedAt: "2026-10-01T11:00:00+02:00" }).success, false);
});
