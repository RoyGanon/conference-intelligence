import type { RealConferenceRead } from "./conferences-server";
import { scoreConference } from "./conference-scoring";
import { conferenceSchema } from "./schemas";
import { geographicRegions } from "./geography";

type AcceptedRecord = Extract<RealConferenceRead, { status: "available" }>["conferences"][number];
// Only complete, accepted inputs enter the existing deterministic ICP scorer.
export function prepareConferenceDiscovery(record: AcceptedRecord) {
  const complete = record.assessment?.complete === true && record.missingInputs.length === 0;
  const scoring = complete ? scoreConference(conferenceSchema.parse(record.conference)) : null;
  if (scoring) {
    for (const item of scoring.breakdown) {
      if (item.factor === "audience") item.reason = `Reviewed evidence-based audience fit: ${record.conference.targetAudienceFit}/100 (${record.rubricVersion}).`;
      if (item.factor === "vertical") item.reason = `Configured ICP priority for ${record.conference.vertical}: ${item.rawScore}/100.`;
      if (item.factor === "geography") item.reason = `Configured market priority for ${record.conference.region}: ${item.rawScore}/100; not a distance calculation.`;
    }
  }
  // Explicit public display DTO: no credentials, request options or server configuration.
  return { conference: record.conference, scoring, supportedScoreFloor: record.supportedScoreFloor,
    rubricVersion: record.rubricVersion, missingInputs: record.missingInputs,
    unresolvedFactors: record.unresolvedFactors, pendingReview: record.assessment?.pendingReview ?? true };
}
export type DiscoveryConference = ReturnType<typeof prepareConferenceDiscovery>;

export function filterDiscoveryConferences(conferences: DiscoveryConference[], filters: { search: string; vertical: string; region: string; tier: string }) {
  const query = filters.search.trim().toLowerCase();
  return conferences.filter(({ conference: c, scoring }) =>
    (!filters.vertical || c.vertical === filters.vertical) &&
    (!filters.region || (filters.region === "unknown" ? c.region === null : c.region === filters.region)) &&
    (!filters.tier || (filters.tier === "incomplete" ? scoring === null : scoring?.tier === filters.tier)) &&
    `${c.name} ${c.city} ${c.country} ${c.vertical} ${c.region ? geographicRegions[c.region].label : "unknown"}`.toLowerCase().includes(query))
    .sort((a, b) => (b.scoring?.score ?? -1) - (a.scoring?.score ?? -1) || a.conference.startDate.localeCompare(b.conference.startDate) || a.conference.id.localeCompare(b.conference.id));
}
