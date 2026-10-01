import type { Conference, ConferenceScore, GeographicRegion, Tier, Vertical } from "@/types";

// Explicit demo ICP assumptions. All raw scores use the same 0–100 scale.
export const verticalFit: Record<Vertical, number> = {
  fintech: 100, ecommerce: 85, travel: 70, saas: 40,
};
export const geographyFit: Record<GeographicRegion, number> = {
  "uk-southeast": 100, benelux: 85, "us-northeast": 75,
  "us-west": 60, "israel-central": 80,
};
export const scoringFactors = {
  vertical: { label: "Vertical fit", weight: 0.4 },
  audience: { label: "Target audience fit", weight: 0.3 },
  size: { label: "Audience size fit", weight: 0.15 },
  geography: { label: "Geography fit", weight: 0.15 },
} as const;

export function audienceSizeFit(size: number): number {
  if (size === 0) return 0;
  if (size >= 1000) return 100;
  if (size >= 500) return 80;
  if (size >= 250) return 60;
  return 40;
}

export function scoreTier(score: number): Tier {
  return score >= 80 ? "A" : score >= 60 ? "B" : "C";
}

// Additive extension preserves the existing ConferenceScore contract.
export type ExplainedConferenceScore = Omit<ConferenceScore, "breakdown"> & {
  breakdown: (ConferenceScore["breakdown"][number] & { weightedContribution: number })[];
};

export function scoreConference(conference: Conference): ExplainedConferenceScore {
  const raw: Record<keyof typeof scoringFactors, { score: number; reason: string }> = {
    vertical: {
      score: verticalFit[conference.vertical],
      reason: `${conference.vertical} receives ${verticalFit[conference.vertical]}/100 in the demo ICP: fintech 100, ecommerce 85, travel 70, SaaS 40.`,
    },
    audience: {
      score: conference.targetAudienceFit,
      reason: `The synthetic fixture provides a target audience fit of ${conference.targetAudienceFit}/100. This is a demo estimate of audience relevance.`,
    },
    size: {
      score: audienceSizeFit(conference.estimatedAudienceSize),
      reason: `${conference.estimatedAudienceSize.toLocaleString("en-US")} estimated attendees. Bands: 1,000+ = 100; 500–999 = 80; 250–499 = 60; 1–249 = 40; zero = 0.`,
    },
    geography: {
      score: geographyFit[conference.region],
      reason: `Demo market priority for ${conference.region}: ${geographyFit[conference.region]}/100. Southeast England 100, Benelux 85, Central Israel 80, US Northeast 75, Bay Area 60.`,
    },
  };
  const breakdown = (Object.keys(scoringFactors) as (keyof typeof scoringFactors)[]).map(factor => ({
    factor,
    rawScore: raw[factor].score,
    weight: scoringFactors[factor].weight,
    weightedContribution: Math.round(raw[factor].score * scoringFactors[factor].weight * 100) / 100,
    reason: raw[factor].reason,
  }));
  const score = Math.round(breakdown.reduce((sum, item) => sum + item.weightedContribution, 0));
  return { score, tier: scoreTier(score), breakdown };
}
