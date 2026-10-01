import type { z } from "zod";
import type { captureInputSchema, conferenceSchema, contactSchema, interactionSchema, regionSchema, tierSchema, verticalSchema } from "@/lib/schemas";
export type Conference = z.infer<typeof conferenceSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Interaction = z.infer<typeof interactionSchema>;
export type CaptureInput = z.infer<typeof captureInputSchema>;
export type GeographicRegion = z.infer<typeof regionSchema>;
export type Vertical = z.infer<typeof verticalSchema>;
export type Tier = z.infer<typeof tierSchema>;
// Derived view contract; scores are never persisted on conferences.
export type ConferenceScore = {
  score: number; tier: Tier;
  breakdown: { factor: "vertical" | "audience" | "size" | "geography"; rawScore: number; weight: number; reason: string }[];
};

