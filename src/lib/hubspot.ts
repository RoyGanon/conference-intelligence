import { z } from "zod";
import { contactSchema } from "./schemas";

export const hubspotContactSchema = contactSchema.pick({ name: true, email: true, company: true, role: true }).strict();
export const hubspotRequestSchema = z.strictObject({
  action: z.enum(["preview", "live", "simulate"]), contact: hubspotContactSchema,
});
export type HubspotContact = z.infer<typeof hubspotContactSchema>;
export const hubspotPropertiesSchema = z.strictObject({
  firstname: z.string(), lastname: z.string().optional(), email: z.string().optional(),
  company: z.string().optional(), jobtitle: z.string().optional(),
});
export const hubspotResponseSchema = z.strictObject({
  mode: z.enum(["live", "simulation"]),
  properties: hubspotPropertiesSchema,
  outcome: z.enum(["preview", "created", "updated", "simulated"]),
  contactId: z.string().min(1).optional(),
}).superRefine((value, context) => {
  const liveWrite = value.outcome === "created" || value.outcome === "updated";
  if ((liveWrite && (value.mode !== "live" || !value.contactId)) ||
    (value.outcome === "simulated" && value.mode !== "simulation") ||
    (!liveWrite && value.contactId !== undefined)) {
    context.addIssue({ code: "custom", message: "Export mode, outcome, and contact ID are inconsistent." });
  }
});
export type HubspotResponse = z.infer<typeof hubspotResponseSchema>;

// The existing model stores one full name. Show this explicit assumption in preview.
// Missing optional values are omitted, so export never clears existing CRM fields.
export function hubspotProperties(contact: HubspotContact) {
  const [firstname, ...rest] = contact.name.trim().split(/\s+/);
  return {
    firstname, ...(rest.length ? { lastname: rest.join(" ") } : {}),
    ...(contact.email ? { email: contact.email.trim().toLowerCase() } : {}),
    ...(contact.company?.trim() ? { company: contact.company.trim() } : {}),
    ...(contact.role?.trim() ? { jobtitle: contact.role.trim() } : {}),
  };
}
