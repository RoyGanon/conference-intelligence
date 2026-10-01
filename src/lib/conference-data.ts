import { z } from "zod";
import { conferenceSchema, regionSchema } from "./schemas";

const timestamp = z.iso.datetime({ offset: true });
const text = z.string().trim().min(1);
const sourceUrl = z.url().refine(value => new URL(value).protocol === "https:" || new URL(value).protocol === "http:", "Source must be an HTTP(S) URL");
export const conferenceLifecycleSchema = z.enum(["scheduled", "changed", "cancelled"]);
export const conferenceEvidenceSchema = z.strictObject({
  sourceUrl, sourceName: text.max(160), checkedAt: timestamp,
  excerpt: text.max(4000),
});
// Separate storage contract: runtime fixtures/scoring continue using Conference unchanged.
export const storedConferenceSchema = z.strictObject({
  ...conferenceSchema.shape,
  region: regionSchema.nullable(),
  estimatedAudienceSize: z.number().int().nonnegative().nullable(),
  targetAudienceFit: z.number().int().min(0).max(100).nullable(),
  editionKey: text.max(300).nullable(),
  lifecycleStatus: conferenceLifecycleSchema,
  needsReview: z.boolean(), reviewReason: text.max(2000).nullable(),
  sourceUrl: sourceUrl.nullable(), sourceName: text.max(160).nullable(),
  lastCheckedAt: timestamp.nullable(), lastVerifiedAt: timestamp.nullable(),
  acceptedEvidence: z.record(z.string(), conferenceEvidenceSchema),
  updatedAt: timestamp, revision: z.number().int().positive(),
}).superRefine((value, context) => {
  if (value.endDate < value.startDate) context.addIssue({ code: "custom", message: "End date must be on or after start date", path: ["endDate"] });
  if (!value.isDemo && (!value.editionKey || !value.sourceUrl || !value.sourceName)) {
    context.addIssue({ code: "custom", message: "Real records require edition identity and a source." });
  }
  if (value.needsReview && !value.reviewReason) context.addIssue({ code: "custom", message: "Review requires a reason." });
});

export const conferenceFactsSchema = z.strictObject({
  name: text.max(160).optional(), startDate: z.iso.date().optional(), endDate: z.iso.date().optional(),
  city: text.optional(), country: text.optional(),
  region: regionSchema.nullable().optional(), vertical: conferenceSchema.shape.vertical.optional(),
  estimatedAudienceSize: z.number().int().nonnegative().nullable().optional(),
  targetAudienceFit: z.number().int().min(0).max(100).nullable().optional(),
  lifecycleStatus: conferenceLifecycleSchema.optional(),
}).refine(value => !value.startDate || !value.endDate || value.endDate >= value.startDate, "Invalid date range");

export const conferenceObservationSchema = z.strictObject({
  id: z.uuid(), conferenceId: z.uuid().nullable(), editionKey: text.max(300),
  sourceUrl, sourceName: text.max(160), checkedAt: timestamp,
  verifiedAt: timestamp.nullable(),
  fetchStatus: z.enum(["success", "failed"]),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  evidence: z.array(conferenceEvidenceSchema).max(100),
  extractedFacts: conferenceFactsSchema, proposedChanges: conferenceFactsSchema,
  issues: z.array(text.max(2000)).max(100),
  reviewState: z.enum(["pending", "accepted", "rejected", "no_change"]),
  reviewedAt: timestamp.nullable(),
}).refine(value => value.fetchStatus !== "failed" || (value.verifiedAt === null && value.reviewState !== "accepted"), "Failed checks cannot verify or accept facts");

export const conferenceResearchRunSchema = z.strictObject({
  id: z.uuid(), startedAt: timestamp, finishedAt: timestamp.nullable(),
  status: z.enum(["running", "succeeded", "partial", "failed"]),
  counts: z.record(z.string(), z.number().int().nonnegative()),
  errors: z.array(text.max(2000)).max(100),
  cursor: z.record(z.string(), z.unknown()),
  leaseKey: text.max(160).nullable(), leaseExpiresAt: timestamp.nullable(),
}).refine(value => (value.leaseKey === null) === (value.leaseExpiresAt === null), "Lease fields must be paired")
  .refine(value => value.finishedAt === null || Date.parse(value.finishedAt) >= Date.parse(value.startedAt), "Run finishes before it starts");

export type StoredConference = z.infer<typeof storedConferenceSchema>;
export type ConferenceObservation = z.infer<typeof conferenceObservationSchema>;
export type ConferenceResearchRun = z.infer<typeof conferenceResearchRunSchema>;
