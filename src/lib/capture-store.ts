import { z } from "zod";
import { captureInputSchema, contactSchema, interactionSchema } from "./schemas";
import { demoContacts, demoInteractions, demoConferences } from "./demo-fixtures";
import { matchContacts, normalizeIdentity } from "./contact-matching";
import type { Interaction } from "@/types";

export function chronologicalInteractions(interactions: readonly Interaction[]): Interaction[] {
  return [...interactions].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt) || a.id.localeCompare(b.id));
}

const conferenceReferenceSchema = z.object({ id: z.uuid(), name: z.string().trim().min(1).max(160) });
export type CaptureConference = z.infer<typeof conferenceReferenceSchema>;
const stateSchema = z.object({ contacts: z.array(contactSchema), interactions: z.array(interactionSchema), conferences: z.array(conferenceReferenceSchema).default([]) });
export function interactionConferenceName(state: CaptureState | undefined, id: string, active: readonly CaptureConference[] = [], labelDemo = true) {
  return active.find(c => c.id === id)?.name ?? state?.conferences.find(c => c.id === id)?.name ?? (demoConferences.find(c => c.id === id) ? `${demoConferences.find(c => c.id === id)!.name}${labelDemo ? " (synthetic demo)" : ""}` : "Conference unavailable");
}
export type CaptureState = z.infer<typeof stateSchema>;
const key = "grain.capture-demo.v1";
export function readCaptureState(): CaptureState {
  const raw = localStorage.getItem(key);
  const state = raw ? stateSchema.parse(JSON.parse(raw)) : { contacts: demoContacts, interactions: demoInteractions, conferences: [] };
  const emails = state.contacts.map(c => normalizeIdentity(c.email)).filter(Boolean);
  if (new Set(emails).size !== emails.length) throw new Error("Saved demo data contains duplicate emails. Capture was not changed.");
  if (new Set(state.contacts.map(c => c.id)).size !== state.contacts.length || new Set(state.interactions.map(i => i.id)).size !== state.interactions.length || state.interactions.some(i => !state.contacts.some(c => c.id === i.contactId) || (!demoConferences.some(c => c.id === i.conferenceId) && !state.conferences.some(c => c.id === i.conferenceId)))) throw new Error("Saved demo data is invalid. Capture was not changed.");
  return state;
}
// Storage adapter boundary: replace with a protected server mutation when persistence is configured.
export function saveCapture(raw: unknown, decision: string | "new", submissionId: string, conferences: readonly CaptureConference[] = demoConferences) {
  z.uuid().parse(submissionId);
  const input = captureInputSchema.parse(raw);
  const conference = conferences.find(c => c.id === input.conferenceId);
  if (!conference) throw new Error("Choose a listed conference.");
  const state = readCaptureState();
  const previous = state.interactions.find(i => i.id === submissionId);
  if (previous) return previous.contactId;
  const matches = matchContacts(input, state.contacts);
  const selected = decision === "new" ? undefined : state.contacts.find(c => c.id === decision);
  if (decision !== "new" && (!selected || !matches.some(m => m.contact.id === decision))) throw new Error("Review the contact matches again.");
  if (!selected && input.email && state.contacts.some(c => normalizeIdentity(c.email) === normalizeIdentity(input.email))) throw new Error("This email belongs to an existing contact. Choose Same person, or go back and remove/correct the email to save a different person.");
  const now = new Date().toISOString();
  const contact = selected ?? contactSchema.parse({ id: crypto.randomUUID(), name: input.name, email: input.email ? normalizeIdentity(input.email) : null, company: input.company || null, role: input.role || null, createdAt: now, updatedAt: now });
  const interaction = interactionSchema.parse({ id: submissionId, contactId: contact.id, conferenceId: input.conferenceId, occurredAt: input.occurredAt, notes: input.notes, createdAt: now });
  const next = { conferences: [...state.conferences.filter(c => c.id !== conference.id), conferenceReferenceSchema.parse(conference)], contacts: selected ? state.contacts : [...state.contacts, contact], interactions: [...state.interactions, interaction] };
  localStorage.setItem(key, JSON.stringify(stateSchema.parse(next)));
  return contact.id;
}
