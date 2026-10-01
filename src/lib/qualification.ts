import { z } from "zod";

const text = z.string().trim().min(1).max(2000);
export const qualificationSchema = z.strictObject({
  priority: z.enum(["low", "medium", "high"]),
  score: z.number().int().min(0).max(100),
  relationshipStatus: z.enum(["new", "developing", "warming", "stalled", "insufficient_evidence"]),
  reasons: z.array(text).min(1).max(8),
  progressionSummary: text,
  suggestedNextAction: text,
  missingEvidence: z.array(text).max(8),
});
export const qualificationInputSchema = z.strictObject({
  contact: z.strictObject({ name: z.string().trim().min(1).max(160), company: z.string().max(160).nullable(), role: z.string().max(160).nullable() }),
  interactions: z.array(z.strictObject({
    occurredAt: z.iso.datetime({ offset: true }), conference: z.string().min(1).max(160), notes: z.string().max(5000),
  })).max(100),
}).refine(v => v.interactions.reduce((sum, i) => sum + i.notes.length, 0) <= 50000, { message: "History exceeds the analysis limit." });
export const qualificationResponseSchema = z.strictObject({ mode: z.enum(["demo", "live"]), analysis: qualificationSchema });
export type QualificationInput = z.infer<typeof qualificationInputSchema>;
export type QualificationResponse = z.infer<typeof qualificationResponseSchema>;
