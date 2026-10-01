import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const external = createRequire(import.meta.url);
const { dataPath, validateDataset, buildSql } = external("../scripts/prepare-real-conferences.cjs");
const { assessTargetAudience, targetAudienceRubricVersion } = external("../src/lib/target-audience-fit.ts");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const first = data.records[0];
const evidence = first.conference.acceptedEvidence;
test("versioned evidence-linked scoring is deterministic and preserves input", () => {
  const original = JSON.stringify(first);
  const result = assessTargetAudience(first.targetAudienceAssessment, evidence);
  assert.deepEqual(result, assessTargetAudience(structuredClone(first.targetAudienceAssessment), evidence));
  assert.equal(result.rubricVersion, targetAudienceRubricVersion);
  assert.equal(JSON.stringify(first), original);
  assert.equal(result.supportedScoreFloor, 90);
  assert.equal(result.components[0].awardedTags[0].evidenceRefs[0], "targetAudience");
});
test("overlapping and duplicate tags award the highest level once", () => {
  const input = structuredClone(first.targetAudienceAssessment);
  input.factors.audience.tags.push(...structuredClone(input.factors.audience.tags));
  assert.equal(assessTargetAudience(input, evidence).components[0].points, 60);
  input.factors.relevance.tags.push({ tag: "fx", evidenceRefs: ["targetAudience"], reviewed: true });
  input.factors.relevance.resolved = true; input.factors.relevance.unresolvedReason = null;
  assert.equal(assessTargetAudience(input, evidence).supportedScoreFloor, 100);
});
test("unknown is null; explicit evidence-backed non-applicability is zero", () => {
  const input = structuredClone(data.records[2].targetAudienceAssessment);
  assert.equal(assessTargetAudience(input, data.records[2].conference.acceptedEvidence).components[2].points, null);
  input.factors.leadership.resolved = true; input.factors.leadership.unresolvedReason = null;
  assert.throws(() => assessTargetAudience(input, evidence), /resolution requires/);
  const negative = { ...evidence, negative: { ...evidence.targetAudience, excerpt: "Test evidence explicitly establishes no relevant buyers or leadership." } };
  input.factors.leadership.resolutionEvidenceRefs = ["negative"];
  assert.equal(assessTargetAudience(input, negative).components[2].points, 0);
});
test("incomplete assessments expose floor/unresolved factors without an accepted score", () => {
  const result = assessTargetAudience(first.targetAudienceAssessment, evidence);
  assert.equal(result.complete, false); assert.equal(result.acceptedScore, null);
  assert.deepEqual(result.unresolvedFactors.map(x => x.factor), ["relevance"]);
  assert.equal("tier" in result, false);
});
test("only reviewed complete assessments accept scores; lower levels require resolution evidence", () => {
  const input = structuredClone(first.targetAudienceAssessment);
  input.factors.relevance.resolved = true; input.factors.relevance.unresolvedReason = null;
  assert.throws(() => assessTargetAudience(input, evidence), /resolution requires/);
  const reviewedEvidence = { ...evidence, resolution: { ...evidence.targetAudience, excerpt: "Test evidence rules out cross-border, FX and multi-currency audience relevance." } };
  input.factors.relevance.resolutionEvidenceRefs = ["resolution"];
  assert.equal(assessTargetAudience(input, reviewedEvidence).acceptedScore, 90);
  input.reviewState = "pending"; input.reviewedAt = null; input.reviewedBy = null;
  const pending = assessTargetAudience(input, reviewedEvidence);
  assert.equal(pending.acceptedScore, null); assert.equal(pending.pendingReview, true);
});
test("dangling/malformed evidence, unreviewed tags and unsupported versions fail closed", () => {
  const input = structuredClone(first.targetAudienceAssessment);
  input.factors.audience.tags[0].evidenceRefs = ["missing"];
  assert.throws(() => assessTargetAudience(input, evidence), /Missing source evidence/);
  assert.throws(() => assessTargetAudience(first.targetAudienceAssessment, { targetAudience: { ...evidence.targetAudience, sourceUrl: "file:///secret" } }));
  input.factors.audience.tags[0].evidenceRefs = ["targetAudience"];
  input.factors.audience.tags[0].reviewed = false;
  assert.throws(() => assessTargetAudience(input, evidence));
  assert.throws(() => assessTargetAudience({ ...first.targetAudienceAssessment, rubricVersion: "v2" }, evidence));
});
test("eight reviewed assignments retain approved floors, null scores and import metadata", () => {
  const records = validateDataset(data).records;
  assert.deepEqual(records.map(r => assessTargetAudience(r.targetAudienceAssessment, r.conference.acceptedEvidence).supportedScoreFloor), [90, 90, 60, 75, 85, 90, 55, 90]);
  for (const r of records) assert.equal(assessTargetAudience(r.targetAudienceAssessment, r.conference.acceptedEvidence).acceptedScore, null);
  assert.match(buildSql(data), /target_audience_assessment/);
  const altered = structuredClone(data); altered.records[0].conference.targetAudienceFit = 90;
  assert.throws(() => validateDataset(altered), /Accepted target audience fit/);
});
