import { z } from "zod";
const timestamp = z.iso.datetime({ offset: true });
const score = z.number().int().min(0).max(100);
export const verticalSchema = z.enum(["fintech", "ecommerce", "travel", "saas"]);
export const regionSchema = z.enum(["uk-southeast", "benelux", "us-northeast", "us-west", "israel-central"]);
export const tierSchema = z.enum(["A", "B", "C"]);
export const conferenceSchema = z.object({
  id: z.uuid(), name: z.string().trim().min(1).max(160),
  startDate: z.iso.date(), endDate: z.iso.date(),
  city: z.string().trim().min(1), country: z.string().trim().min(1),
  region: regionSchema, vertical: verticalSchema,
  estimatedAudienceSize: z.number().int().nonnegative(), targetAudienceFit: score,
  attendanceStatus: z.enum(["unplanned", "planned"]), isDemo: z.boolean(),
}).refine(v => v.endDate >= v.startDate, { message: "End date must be on or after start date", path: ["endDate"] });
export const contactSchema = z.object({
  id: z.uuid(), name: z.string().trim().min(1).max(160),
  email: z.email().max(254).nullable(), company: z.string().trim().max(160).nullable(),
  role: z.string().trim().max(160).nullable(), createdAt: timestamp, updatedAt: timestamp,
});
export const interactionSchema = z.object({
  id: z.uuid(), contactId: z.uuid(), conferenceId: z.uuid(),
  occurredAt: timestamp, notes: z.string().trim().max(5000), createdAt: timestamp,
});
// Validated at the capture and persistence boundaries. Blank optional form fields become undefined.
export const captureInputSchema = z.object({
  conferenceId: z.uuid(), name: z.string().trim().min(1).max(160),
  email: z.email().max(254).optional(), company: z.string().trim().max(160).optional(),
  role: z.string().trim().max(160).optional(), notes: z.string().trim().max(5000).default(""),
  occurredAt: timestamp,
});

