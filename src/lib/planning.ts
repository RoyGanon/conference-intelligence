import { geographicRegions } from "./geography";
import { scoreConference } from "./conference-scoring";
import type { Conference, Vertical } from "@/types";

export type PlanningConference = Omit<Conference, "region" | "estimatedAudienceSize" | "targetAudienceFit"> & { region: Conference["region"] | null; estimatedAudienceSize: number | null; targetAudienceFit: number | null };
export const quarters = [1, 2, 3, 4] as const;
export type Quarter = (typeof quarters)[number];
export type PlanningConfiguration = {
  year: number;
  strategicVerticals: readonly Vertical[];
};
export type TripOpportunity<T extends PlanningConference = Conference> = {
  id: string;
  conferences: readonly [T, T];
  daysApart: number;
  locationReason: string;
  reason: string;
};
export type CoverageGap = {
  id: string;
  quarter: Quarter;
  vertical: Vertical;
  reason: string;
};

export function conferenceQuarter(conference: PlanningConference): Quarter {
  return (Math.floor((Number(conference.startDate.slice(5, 7)) - 1) / 3) + 1) as Quarter;
}

export function setConferencePlanned<T extends PlanningConference>(conferences: readonly T[], id: string, planned: boolean): T[] {
  return conferences.map(conference => conference.id === id
    ? { ...conference, attendanceStatus: planned ? "planned" : "unplanned" } : conference);
}

/** Start dates determine quarter membership and the inclusive seven-day window.
 * UTC arithmetic makes results independent of timezone and DST.
 * ICP tiers come from the shared deterministic scoring function.
 */
export function buildYearlyPlan<T extends PlanningConference>(conferences: readonly T[], config: PlanningConfiguration, tierFor: (conference: T) => string | null = conference => conference.region === null || conference.estimatedAudienceSize === null || conference.targetAudienceFit === null ? null : scoreConference(conference as Conference).tier) {
  const planned = conferences.filter(conference => conference.attendanceStatus === "planned"
    && Number(conference.startDate.slice(0, 4)) === config.year)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
  const byQuarter = Object.fromEntries(quarters.map(quarter => [quarter,
    planned.filter(conference => conferenceQuarter(conference) === quarter),
  ])) as Record<Quarter, T[]>;
  const trips: TripOpportunity<T>[] = [];
  const highPriority = planned.filter(conference => tierFor(conference) === "A");
  for (let i = 0; i < highPriority.length; i++) {
    for (let j = i + 1; j < highPriority.length; j++) {
      const first = highPriority[i];
      const second = highPriority[j];
      const daysApart = (Date.parse(`${second.startDate}T00:00:00Z`)
        - Date.parse(`${first.startDate}T00:00:00Z`)) / 86_400_000;
      if (daysApart > 7) break;
      const sameCity = first.city.trim().toLowerCase() === second.city.trim().toLowerCase()
        && first.country.trim().toLowerCase() === second.country.trim().toLowerCase();
      const sameRegion = first.region !== null && first.region === second.region;
      if (!sameCity && !sameRegion) continue;
      const locationReason = sameCity ? `Same city: ${first.city}`
        : `Same region: ${geographicRegions[first.region!].label}`;
      trips.push({ id: `trip:${first.id}:${second.id}`, conferences: [first, second], daysApart, locationReason,
        reason: `Both conferences are planned and Tier A. Their start dates are ${daysApart} ${daysApart === 1 ? "day" : "days"} apart (within 7 days). ${locationReason}.`,
      });
    }
  }
  const gaps: CoverageGap[] = quarters.flatMap(quarter => [...new Set(config.strategicVerticals)]
    .filter(vertical => !byQuarter[quarter].some(conference => conference.vertical === vertical))
    .map(vertical => ({ id: `gap:${config.year}:${quarter}:${vertical}`, quarter, vertical,
      reason: `${vertical} is a configured strategic vertical, but no planned conference starts in Q${quarter} ${config.year} for this vertical.`,
    })));
  return { planned, byQuarter, trips, gaps };
}
