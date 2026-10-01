/* eslint-disable @typescript-eslint/no-require-imports -- Offline CommonJS tool using the existing TypeScript compiler. */
const fs = require("node:fs"), path = require("node:path"), ts = require("typescript");
const { z } = require("zod");
require.extensions[".ts"] = (compiledModule, filename) => {
  compiledModule._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
};
const { storedConferenceSchema, conferenceEvidenceSchema, conferenceObservationSchema } = require("../src/lib/conference-data.ts");
const { targetAudienceAssessmentSchema, assessTargetAudience } = require("../src/lib/target-audience-fit.ts");
const dataPath = path.resolve(__dirname, "../supabase/data/verified-conferences-2026-10-01.json");
const datasetSchema = z.strictObject({
  verifiedAt: z.iso.datetime({ offset: true }), upcomingAsOf: z.iso.date(), evidenceFormat: z.string().min(1),
  records: z.array(z.strictObject({
    conference: storedConferenceSchema, observationId: z.uuid(),
    targetAudienceAssessment: targetAudienceAssessmentSchema,
    attendanceClaims: z.array(z.strictObject({
      basis: z.enum(["current_expected", "historical", "edition_unspecified"]),
      editionYear: z.number().int().nullable(), display: z.string().min(1), value: z.number().int().nonnegative(),
      qualifier: z.enum(["target", "lower_bound", "approximate"]), note: z.string().min(1), evidence: conferenceEvidenceSchema,
    })),
    incompleteFields: z.array(z.enum(["region", "estimatedAudienceSize", "targetAudienceFit"])),
    icpStatus: z.literal("incomplete"), notes: z.array(z.string()),
  })).min(8).max(12),
});
function validateDataset(raw) {
  const data = datasetSchema.parse(raw);
  const ids = new Set(), editions = new Set(), observations = new Set();
  for (const r of data.records) {
    const c = r.conference;
    const assessment = assessTargetAudience(r.targetAudienceAssessment, c.acceptedEvidence);
    if (c.targetAudienceFit !== assessment.acceptedScore) throw new Error("Accepted target audience fit must match the reviewed assessment.");
    if (c.isDemo || c.startDate <= data.upcomingAsOf || c.needsReview) throw new Error("Requires upcoming verified real records without unresolved conflicts.");
    if (ids.has(c.id) || editions.has(c.editionKey) || observations.has(r.observationId)) throw new Error("Duplicate dataset identity.");
    ids.add(c.id); editions.add(c.editionKey); observations.add(r.observationId);
    for (const field of ["name", "startDate", "endDate", "city", "country", "vertical", "lifecycleStatus", "targetAudience"]) {
      if (!c.acceptedEvidence[field]) throw new Error(`Missing evidence: ${field}`);
    }
    if (c.region !== null && !c.acceptedEvidence.region) throw new Error("Missing region classification evidence.");
    const missing = [...(c.targetAudienceFit === null ? ["targetAudienceFit"] : []), ...(c.estimatedAudienceSize === null ? ["estimatedAudienceSize"] : []), ...(c.region === null ? ["region"] : [])];
    if (JSON.stringify(missing) !== JSON.stringify(r.incompleteFields)) throw new Error("Incomplete scoring fields are inconsistent.");
    if (c.estimatedAudienceSize !== null && (!c.acceptedEvidence.estimatedAudienceSize || !r.attendanceClaims.some(claim => claim.basis === "current_expected" && claim.editionYear === Number(c.startDate.slice(0, 4)) && claim.qualifier === "target" && claim.value === c.estimatedAudienceSize))) throw new Error("Attendance requires an explicit current-edition target; historical/qualified figures cannot supply it.");
  }
  return data;
}
const literal = value => value === null ? "NULL" : typeof value === "boolean" || typeof value === "number" ? String(value) : "'" + String(value).replaceAll("'", "''") + "'";
function buildSql(raw) {
  const data = validateDataset(raw);
  const output = ["-- Verified offline import. Apply all three migrations first. Review before execution.", "-- No existing records or planning selections are overwritten.", "begin;", "set local standard_conforming_strings = on;", "lock table public.conferences in share row exclusive mode;"];
  for (const r of data.records) {
    const c = r.conference;
    const fields = { id: c.id, name: c.name, start_date: c.startDate, end_date: c.endDate, city: c.city, country: c.country,
      region: c.region, vertical: c.vertical, estimated_audience_size: c.estimatedAudienceSize, target_audience_fit: c.targetAudienceFit,
      attendance_status: c.attendanceStatus, is_demo: c.isDemo, edition_key: c.editionKey, lifecycle_status: c.lifecycleStatus,
      needs_review: c.needsReview, review_reason: c.reviewReason, source_url: c.sourceUrl, source_name: c.sourceName,
      last_checked_at: c.lastCheckedAt, last_verified_at: c.lastVerifiedAt, accepted_evidence: JSON.stringify(c.acceptedEvidence), updated_at: c.updatedAt, revision: c.revision,
      target_audience_assessment: JSON.stringify({ input: r.targetAudienceAssessment, result: assessTargetAudience(r.targetAudienceAssessment, c.acceptedEvidence) }) };
    const canonical = Object.entries(fields).filter(([key]) => !["attendance_status", "updated_at", "revision", "last_checked_at", "last_verified_at", "accepted_evidence"].includes(key));
    const mismatch = canonical.map(([key, value]) => `${key} is distinct from ${literal(value)}${key === "target_audience_assessment" ? "::jsonb" : ""}`).join(" or ");
    output.push(`do $import$ begin if exists (select 1 from public.conferences where (id = ${literal(c.id)} or (not is_demo and edition_key = ${literal(c.editionKey)})) and (${mismatch})) then raise exception 'Import conflicts with an accepted conference; review instead of overwriting'; end if; end $import$;`);
    output.push(`insert into public.conferences (${Object.keys(fields).join(", ")}) values (${Object.values(fields).map(literal).join(", ")}) on conflict (id) do nothing;`);
    const extractedFacts = Object.fromEntries(["name", "startDate", "endDate", "city", "country", "region", "vertical", "estimatedAudienceSize", "targetAudienceFit", "lifecycleStatus"].map(key => [key, c[key]]));
    const o = conferenceObservationSchema.parse({ id: r.observationId, conferenceId: c.id, editionKey: c.editionKey,
      sourceUrl: c.sourceUrl, sourceName: c.sourceName, checkedAt: data.verifiedAt, verifiedAt: data.verifiedAt,
      fetchStatus: "success", contentHash: null, evidence: [...Object.values(c.acceptedEvidence), ...r.attendanceClaims.map(claim => claim.evidence)],
      extractedFacts, proposedChanges: {}, issues: r.notes.concat(r.attendanceClaims.map(claim => `${claim.basis} (${claim.editionYear ?? "unspecified"}): ${claim.display}. ${claim.note}`)),
      reviewState: "accepted", reviewedAt: data.verifiedAt });
    const observationFields = { id: o.id, conference_id: o.conferenceId, edition_key: o.editionKey,
      source_url: o.sourceUrl, source_name: o.sourceName, checked_at: o.checkedAt, verified_at: o.verifiedAt,
      fetch_status: o.fetchStatus, content_hash: null, evidence: JSON.stringify(o.evidence), extracted_facts: JSON.stringify(o.extractedFacts),
      proposed_changes: "{}", issues: JSON.stringify(o.issues), review_state: o.reviewState, reviewed_at: o.reviewedAt };
    output.push(`insert into public.conference_observations (${Object.keys(observationFields).join(", ")}) values (${Object.values(observationFields).map(literal).join(", ")}) on conflict (id) do nothing;`);
  }
  output.push("commit;");
  return output.join("\n") + "\n";
}
module.exports = { validateDataset, buildSql, dataPath };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 1 && args[0] === "--sql") && !(args.length === 3 && args[0] === "--sql" && args[1] === "--output")) throw new Error("Usage: node scripts/prepare-real-conferences.cjs [--sql [--output path]]");
  const data = validateDataset(JSON.parse(fs.readFileSync(dataPath, "utf8")));
  if (args[0] === "--sql") {
    const sql = buildSql(data);
    if (args[1] === "--output") fs.writeFileSync(args[2], sql, { encoding: "utf8", flag: "wx" });
    else process.stdout.write(sql);
  } else {
    console.log(`Validated ${data.records.length} real editions, evidence and incomplete ICP metadata. No database writes performed.`);
    for (const record of data.records) {
      const result = assessTargetAudience(record.targetAudienceAssessment, record.conference.acceptedEvidence);
      console.log(`${record.conference.name}: supported floor ${result.supportedScoreFloor}/100; accepted ${result.acceptedScore ?? "unknown"}; unresolved ${result.unresolvedFactors.map(item => item.factor).join(", ") || "none"}${result.pendingReview ? "; review pending" : ""}`);
    }
  }
}
