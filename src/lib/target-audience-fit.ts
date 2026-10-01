import { z } from "zod";
import { conferenceEvidenceSchema } from "./conference-data";

export const targetAudienceRubricVersion = "grain-target-audience-v1" as const;
const audience = { payment_companies: 60, psps: 60, acquirers: 60, processors: 60, corporate_treasury: 60,
  merchants_with_fx: 60, banks: 45, financial_institutions: 45, fintech_businesses: 45, corporate_finance: 45,
  travel_with_payments: 30 } as const;
const relevance = { cross_border_payments: 25, fx: 25, currency_management: 25, multi_currency: 25,
  payments: 15, cash_management: 15, liquidity: 15, treasury_operations: 15 } as const;
const leadership = { relevant_senior_leaders: 15, c_suite: 15, directors: 15, heads: 15,
  corporate_treasurers: 15, senior_finance_payment_executives: 15, relevant_buyers: 10, relevant_practitioners: 10 } as const;
const refs = z.array(z.string().min(1)).min(1);
function factorSchema<T extends string>(tags: [T, ...T[]]) {
  return z.strictObject({
    tags: z.array(z.strictObject({ tag: z.enum(tags), evidenceRefs: refs, reviewed: z.literal(true) })),
    resolved: z.boolean(), resolutionEvidenceRefs: z.array(z.string().min(1)),
    unresolvedReason: z.string().trim().min(1).nullable(),
  });
}
export const targetAudienceAssessmentSchema = z.strictObject({
  rubricVersion: z.literal(targetAudienceRubricVersion),
  reviewState: z.enum(["pending", "reviewed"]), reviewedAt: z.iso.datetime({ offset: true }).nullable(),
  reviewedBy: z.string().trim().min(1).nullable(),
  factors: z.strictObject({
    audience: factorSchema(Object.keys(audience) as [keyof typeof audience, ...(keyof typeof audience)[]]),
    relevance: factorSchema(Object.keys(relevance) as [keyof typeof relevance, ...(keyof typeof relevance)[]]),
    leadership: factorSchema(Object.keys(leadership) as [keyof typeof leadership, ...(keyof typeof leadership)[]]),
  }),
}).refine(value => value.reviewState !== "reviewed" || (value.reviewedAt !== null && value.reviewedBy !== null), "Reviewed assessment requires reviewer and timestamp");
export type TargetAudienceAssessment = z.infer<typeof targetAudienceAssessmentSchema>;

// Evidence references address the record's acceptedEvidence keys. No text/name interpretation.
export function assessTargetAudience(raw: unknown, evidence: Record<string, { sourceUrl: string; sourceName: string; checkedAt: string; excerpt: string }>) {
  const input = targetAudienceAssessmentSchema.parse(raw);
  const definitions = { audience, relevance, leadership };
  const maxima = { audience: 60, relevance: 25, leadership: 15 };
  const components = (Object.keys(definitions) as (keyof typeof definitions)[]).map(factor => {
    const item = input.factors[factor];
    const table: Record<string, number> = definitions[factor];
    for (const ref of [...item.tags.flatMap(tag => tag.evidenceRefs), ...item.resolutionEvidenceRefs]) {
      const source = evidence[ref];
      if (!source || !source.sourceUrl || !source.sourceName || !source.checkedAt || !source.excerpt?.trim()) throw new Error(`Missing source evidence: ${ref}`);
      conferenceEvidenceSchema.parse(source);
    }
    const points = item.tags.length ? Math.max(...item.tags.map(tag => table[tag.tag])) : null;
    // Lower levels/zero need evidence establishing that higher levels do not apply.
    if (item.resolved && points !== maxima[factor] && item.resolutionEvidenceRefs.length === 0) throw new Error(`${factor}: lower/zero resolution requires explicit evidence`);
    if (!item.resolved && !item.unresolvedReason) throw new Error(`${factor}: unresolved evidence needs an explanation`);
    if (item.resolved && item.unresolvedReason !== null) throw new Error(`${factor}: resolved factor cannot retain an unresolved reason`);
    const awardedTags = item.tags.filter(tag => table[tag.tag] === points).map(tag => ({ tag: tag.tag, evidenceRefs: [...new Set(tag.evidenceRefs)].sort() }))
      .sort((a, b) => a.tag.localeCompare(b.tag));
    return { factor, maximum: maxima[factor], points: points ?? (item.resolved ? 0 : null), resolved: item.resolved,
      awardedTags, resolutionEvidenceRefs: [...new Set(item.resolutionEvidenceRefs)].sort(), unresolvedReason: item.unresolvedReason };
  });
  const supportedScoreFloor = components.reduce((sum, item) => sum + (item.points ?? 0), 0);
  const unresolvedFactors = components.filter(item => !item.resolved).map(item => ({ factor: item.factor, reason: item.unresolvedReason! }));
  const complete = input.reviewState === "reviewed" && unresolvedFactors.length === 0;
  return { rubricVersion: targetAudienceRubricVersion, supportedScoreFloor, complete,
    acceptedScore: complete ? supportedScoreFloor : null, unresolvedFactors,
    pendingReview: input.reviewState !== "reviewed", components };
}
export type TargetAudienceFitResult = ReturnType<typeof assessTargetAudience>;
