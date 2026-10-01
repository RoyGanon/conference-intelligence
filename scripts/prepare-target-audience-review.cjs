/* eslint-disable @typescript-eslint/no-require-imports -- Offline CommonJS SQL preparation; no database/network access. */
const fs = require("node:fs"), path = require("node:path");
const { createHash } = require("node:crypto");
const { validateDataset, dataPath } = require("./prepare-real-conferences.cjs");
const { storedConferenceSchema, conferenceObservationSchema } = require("../src/lib/conference-data.ts");
const { assessTargetAudience } = require("../src/lib/target-audience-fit.ts");
const baselinePath = path.resolve(__dirname, "../supabase/data/target-audience-review-baseline.json");
const reviewedIds = [1, 2, 3, 4, 5].map(n => `20000001-0000-4000-8000-${String(n).padStart(12, "0")}`);
const literal = value => value === null ? "NULL" : typeof value === "boolean" || typeof value === "number" ? String(value) : "'" + String(value).replaceAll("'", "''") + "'";
const json = value => `${literal(JSON.stringify(value))}::jsonb`;
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])));
  return JSON.stringify(value);
}
function prepareReviews(raw, baseline) {
  const data = validateDataset(raw);
  if (!Array.isArray(baseline.records) || baseline.records.length !== 5 || canonical(baseline.records.map(r => r.conference.id).sort()) !== canonical([...reviewedIds].sort())) throw new Error("Review baseline must contain exactly the five approved identities.");
  for (const record of data.records.filter(r => !reviewedIds.includes(r.conference.id))) {
    const hash = createHash("sha256").update(canonical(record)).digest("hex");
    if (baseline.untouchedRecordHashes?.[record.conference.id] !== hash) throw new Error("Unapproved conference record must remain unchanged.");
  }
  return baseline.records.map(previous => {
    const old = storedConferenceSchema.parse(previous.conference);
    const current = data.records.find(r => r.conference.id === old.id);
    if (!current) throw new Error("Missing reviewed conference.");
    const c = current.conference;
    for (const key of Object.keys(old).filter(key => !["acceptedEvidence", "targetAudienceFit"].includes(key))) {
      if (canonical(old[key]) !== canonical(c[key])) throw new Error(`Review cannot change unrelated field: ${key}`);
    }
    for (const [key, evidence] of Object.entries(old.acceptedEvidence)) {
      if (canonical(evidence) !== canonical(c.acceptedEvidence[key])) throw new Error("Review must preserve existing evidence.");
    }
    const addedEvidence = Object.fromEntries(Object.entries(c.acceptedEvidence).filter(([key]) => !Object.hasOwn(old.acceptedEvidence, key)));
    if (!Object.keys(addedEvidence).length) throw new Error("Review needs new source evidence.");
    const before = { input: previous.targetAudienceAssessment, result: assessTargetAudience(previous.targetAudienceAssessment, old.acceptedEvidence) };
    const after = { input: current.targetAudienceAssessment, result: assessTargetAudience(current.targetAudienceAssessment, c.acceptedEvidence) };
    if (old.targetAudienceFit !== null || before.result.acceptedScore !== null || !after.result.complete || after.result.acceptedScore !== 100 || c.targetAudienceFit !== 100) throw new Error("Requires approved incomplete-to-100 review.");
    for (const evidence of Object.values(addedEvidence)) {
      if (evidence.checkedAt !== after.input.reviewedAt) throw new Error("Review timestamps must match new evidence.");
    }
    const firstEvidence = Object.values(addedEvidence)[0];
    const observation = conferenceObservationSchema.parse({
      id: old.id.replace("20000001", "30000002"), conferenceId: old.id, editionKey: old.editionKey,
      sourceUrl: firstEvidence.sourceUrl, sourceName: firstEvidence.sourceName,
      checkedAt: after.input.reviewedAt, verifiedAt: after.input.reviewedAt, fetchStatus: "success", contentHash: null,
      evidence: Object.values(addedEvidence), extractedFacts: { targetAudienceFit: 100 }, proposedChanges: {},
      issues: current.incompleteFields.length ? [`Overall ICP remains incomplete: ${current.incompleteFields.join(", ")}. Attendance and geography were not changed.`] : [],
      reviewState: "accepted", reviewedAt: after.input.reviewedAt,
    });
    return { old, current, before, after, addedEvidence, observation };
  });
}
function buildReviewSql(raw, baseline) {
  const reviews = prepareReviews(raw, baseline);
  const output = ["-- Reviewed Target Audience Fit changes only. Apply to the eight previously imported records.",
    "-- No database connection/execution occurs during generation. Review this complete transaction before running.",
    "-- Attendance, geography, planning, lifecycle, source identity and whole-conference verification timestamps are preserved.",
    "begin;", "set local standard_conforming_strings = on;"];
  for (const { old, current, before, after, addedEvidence, observation: o } of reviews) {
    const expected = { id: old.id, edition_key: old.editionKey, is_demo: false, name: old.name,
      start_date: old.startDate, end_date: old.endDate, city: old.city, country: old.country, region: old.region,
      vertical: old.vertical, estimated_audience_size: old.estimatedAudienceSize, lifecycle_status: old.lifecycleStatus,
      needs_review: old.needsReview, review_reason: old.reviewReason, source_url: old.sourceUrl, source_name: old.sourceName };
    const mismatch = Object.entries(expected).map(([key, value]) => `c.${key} is distinct from ${literal(value)}`).join("\n    or ");
    const observationFields = { id: o.id, conference_id: o.conferenceId, edition_key: o.editionKey,
      source_url: o.sourceUrl, source_name: o.sourceName, checked_at: o.checkedAt, verified_at: o.verifiedAt,
      fetch_status: o.fetchStatus, content_hash: o.contentHash, evidence: JSON.stringify(o.evidence),
      extracted_facts: JSON.stringify(o.extractedFacts), proposed_changes: "{}", issues: JSON.stringify(o.issues), review_state: o.reviewState, reviewed_at: o.reviewedAt };
    const jsonFields = ["evidence", "extracted_facts", "proposed_changes", "issues"];
    const observationMismatch = Object.entries(observationFields).map(([key, value]) => `o.${key} is distinct from ${literal(value)}${jsonFields.includes(key) ? "::jsonb" : ""}`).join("\n      or ");
    output.push(`-- ${current.conference.name}`, `do $review$
declare c public.conferences%rowtype;
begin
  select * into c from public.conferences where id = ${literal(old.id)} for update;
  if not found then raise exception 'Reviewed conference missing; transaction aborted'; end if;
  if ${mismatch}
    or not (c.accepted_evidence @> ${json(old.acceptedEvidence)})
  then raise exception 'Conference facts/evidence changed; review before applying'; end if;
  if exists (select 1 from jsonb_each(${json(addedEvidence)}) e
    where c.accepted_evidence ? e.key and c.accepted_evidence->e.key is distinct from e.value)
  then raise exception 'New evidence key conflicts; review before applying'; end if;
  if c.target_audience_fit is not distinct from 100
    and c.target_audience_assessment is not distinct from ${json(after)}
    and c.accepted_evidence @> ${json(addedEvidence)} then
    null; -- Identical reviewed state: retry does not increment revision.
  elsif c.target_audience_fit is not distinct from NULL
    and c.target_audience_assessment is not distinct from ${json(before)} then
    update public.conferences
    set target_audience_fit = 100,
        target_audience_assessment = ${json(after)},
        accepted_evidence = accepted_evidence || ${json(addedEvidence)},
        updated_at = now(), revision = revision + 1
    where id = ${literal(old.id)};
  else raise exception 'Audience assessment changed; review before applying'; end if;
  insert into public.conference_observations (${Object.keys(observationFields).join(", ")})
  values (${Object.values(observationFields).map(literal).join(", ")}) on conflict (id) do nothing;
  if exists (select 1 from public.conference_observations o where o.id = ${literal(o.id)} and (
      ${observationMismatch}))
  then raise exception 'Review observation ID conflicts; transaction aborted'; end if;
end $review$;`);
  }
  output.push("commit;");
  return output.join("\n") + "\n";
}
module.exports = { prepareReviews, buildReviewSql, baselinePath };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--output") throw new Error("Usage: node scripts/prepare-target-audience-review.cjs --output NEW_SQL_PATH");
  const raw = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  fs.writeFileSync(args[1], buildReviewSql(raw, baseline), { encoding: "utf8", flag: "wx" });
  console.log("Prepared five guarded audience updates and five review observations. No database writes performed.");
}
