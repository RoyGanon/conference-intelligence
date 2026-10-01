import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const requireExternal = createRequire(import.meta.url);
const { validateDataset, buildSql, dataPath } = requireExternal("../scripts/prepare-real-conferences.cjs");
const raw = JSON.parse(fs.readFileSync(dataPath, "utf8"));
test("eight real editions have reviewed fit and only one complete overall ICP", () => {
  const data = validateDataset(raw);
  assert.equal(data.records.length, 8);
  for (const [index, r] of data.records.entries()) {
    assert.equal(r.conference.targetAudienceFit, index < 5 ? 100 : null);
    assert.equal(r.icpStatus, index === 2 ? "complete" : "incomplete");
    assert.equal("tier" in r.conference, false);
    assert.equal(r.conference.isDemo, false);
    assert.ok(r.conference.lastVerifiedAt);
  }
});
test("historical and lower-bound audience claims never become a precise current target", () => {
  const europe = raw.records.find(r => r.conference.editionKey === "money2020:europe:2027");
  assert.equal(europe.conference.estimatedAudienceSize, null);
  assert.equal(europe.attendanceClaims[0].basis, "historical");
  assert.equal(europe.attendanceClaims[0].editionYear, 2026);
  const altered = structuredClone(raw);
  altered.records[5].conference.estimatedAudienceSize = 7500;
  altered.records[5].incompleteFields = ["targetAudienceFit"];
  assert.throws(() => validateDataset(altered), /Attendance requires/);
  const fintech = raw.records.find(r => r.conference.editionKey === "fintechconnect:london:2026");
  assert.equal(fintech.conference.estimatedAudienceSize, 6000);
  assert.equal(fintech.attendanceClaims[0].basis, "current_expected");
});
test("missing evidence, duplicate editions, past events and unresolved review are rejected", () => {
  for (const mutate of [
    data => { delete data.records[0].conference.acceptedEvidence.startDate; },
    data => { data.records[1] = structuredClone(data.records[0]); },
    data => { data.records[0].conference.startDate = "2026-09-01"; },
    data => { data.records[0].conference.needsReview = true; data.records[0].conference.reviewReason = "Conflicting sources"; },
  ]) { const altered = structuredClone(raw); mutate(altered); assert.throws(() => validateDataset(altered)); }
});
test("offline SQL is deterministic, transactional, insert-only and carries observations", () => {
  const sql = buildSql(raw);
  assert.equal(sql, buildSql(structuredClone(raw)));
  assert.equal((sql.match(/insert into public.conferences /g) ?? []).length, 8);
  assert.equal((sql.match(/insert into public.conference_observations /g) ?? []).length, 8);
  assert.match(sql, /begin;/); assert.match(sql, /commit;/);
  assert.match(sql, /raise exception 'Import conflicts/);
  assert.match(sql, /on conflict \(id\) do nothing/);
  assert.doesNotMatch(sql, /\b(delete|update|truncate)\b/i);
  assert.doesNotMatch(sql, /public\.conference_research_runs/);
  assert.match(sql, /historical \(2026\)/);
  const altered = structuredClone(raw); altered.records[0].conference.name = "Organizer's event";
  assert.match(buildSql(altered), /Organizer''s event/);
});
