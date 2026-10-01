import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const external = createRequire(import.meta.url);
const { dataPath, validateDataset } = external("../scripts/prepare-real-conferences.cjs");
const { prepareReviews, buildReviewSql, baselinePath } = external("../scripts/prepare-target-audience-review.cjs");
const { scoreConference } = external("../src/lib/conference-scoring.ts");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

test("five approved changes preserve all unrelated conference facts and original evidence", () => {
  const reviews = prepareReviews(data, baseline);
  assert.equal(reviews.length, 5);
  for (const review of reviews) {
    assert.equal(review.after.result.complete, true); assert.equal(review.after.result.acceptedScore, 100);
    assert.equal(review.after.result.rubricVersion, "grain-target-audience-v1");
    assert.deepEqual(review.after.result.components.map(c => c.points), [60, 25, 15]);
    assert.equal(review.observation.extractedFacts.targetAudienceFit, 100);
    for (const evidence of Object.values(review.addedEvidence)) {
      assert.ok(evidence.sourceUrl.startsWith("https://")); assert.ok(evidence.excerpt.trim());
    }
  }
  assert.equal(reviews.filter(r => r.current.icpStatus === "complete").length, 1);
  const complete = reviews.find(r => r.current.icpStatus === "complete").current.conference;
  assert.equal(complete.name, "FinTech Connect 2026");
  assert.equal(scoreConference(complete).score, 100); assert.equal(scoreConference(complete).tier, "A");
  assert.deepEqual(data.records.slice(5).map(r => r.conference.targetAudienceFit), [null, null, null]);
});
test("unapproved changes, missing evidence, identity changes and inconsistent overall ICP fail closed", () => {
  for (const mutate of [
    d => { d.records[0].conference.estimatedAudienceSize = 11000; },
    d => { d.records[0].conference.attendanceStatus = "planned"; },
    d => { d.records[0].conference.name = "Changed name"; },
    d => { d.records[0].conference.acceptedEvidence.targetAudience.excerpt = "Changed evidence"; },
    d => { delete d.records[0].conference.acceptedEvidence.audienceRelevance2026; },
    d => { d.records[3].icpStatus = "complete"; },
    d => { d.records[5].notes.push("Unapproved alteration"); },
  ]) { const altered = structuredClone(data); mutate(altered); assert.throws(() => prepareReviews(altered, baseline)); }
  const wrong = structuredClone(baseline); wrong.records.pop(); assert.throws(() => prepareReviews(data, wrong));
  const wrongState = structuredClone(data); wrongState.records[2].icpStatus = "incomplete";
  assert.throws(() => validateDataset(wrongState), /Overall ICP state/);
});
test("SQL updates only five assessments/evidence plus revision metadata, guards changes and preserves retries", () => {
  const sql = buildReviewSql(data, baseline);
  assert.equal(sql, buildReviewSql(structuredClone(data), structuredClone(baseline)));
  assert.equal(sql, fs.readFileSync("supabase/reviewed-target-audience-update.sql", "utf8"));
  assert.equal((sql.match(/update public.conferences/g) ?? []).length, 5);
  assert.equal((sql.match(/insert into public.conference_observations/g) ?? []).length, 5);
  assert.equal((sql.match(/^begin;$/gm) ?? []).length, 1); assert.match(sql, /commit;\s*$/);
  assert.match(sql, /for update/); assert.match(sql, /Audience assessment changed/);
  assert.match(sql, /New evidence key conflicts/); assert.match(sql, /Review observation ID conflicts/);
  assert.match(sql, /accepted_evidence = accepted_evidence \|\|/);
  assert.match(sql, /Identical reviewed state: retry does not increment revision/);
  assert.match(sql, /on conflict \(id\) do nothing/);
  for (const statement of sql.matchAll(/update public\.conferences\s+set ([\s\S]*?)\s+where id/g)) {
    const assignments = [...statement[1].matchAll(/\b([a-z_]+)\s*=/g)].map(m => m[1]);
    assert.deepEqual(assignments, ["target_audience_fit", "target_audience_assessment", "accepted_evidence", "updated_at", "revision"]);
  }
  assert.doesNotMatch(sql, /\b(delete|drop|truncate|alter|create)\b/i);
  assert.doesNotMatch(sql, /public\.(contacts|interactions|conference_research_runs)/);
  assert.doesNotMatch(sql, /sb_secret_|SUPABASE_SECRET_KEY|OPENAI_API_KEY/);
});
