import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { hubspotProperties, hubspotRequestSchema, type HubspotResponse } from "./hubspot";

export class HubspotError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}
const recordSchema = z.object({ id: z.string().min(1) });
const searchSchema = z.object({ total: z.number().int().nonnegative(), results: z.array(recordSchema) })
  .refine(value => value.results.length === Math.min(value.total, 2));
// Short-lived, bounded, process-local retry protection; not a persistence layer.
const submissions = new Map<string, { fingerprint: string; expires: number; result: Promise<HubspotResponse> }>();

export async function exportHubspot(raw: unknown, options: { token?: string; fetcher?: typeof fetch; timeoutMs?: number } = {}): Promise<HubspotResponse> {
  const parsed = hubspotRequestSchema.safeParse(raw);
  if (!parsed.success) throw new HubspotError("Invalid contact export request.", 400);
  const { action, contact } = parsed.data;
  const properties = hubspotProperties(contact);
  const token = options.token?.trim();
  const mode = token ? "live" : "simulation";
  if (action === "preview") return { mode, properties, outcome: "preview" };
  if (action === "simulate") {
    if (token) throw new HubspotError("Live export is now configured. Reopen the preview before confirming.", 409);
    return { mode: "simulation", properties, outcome: "simulated" };
  }
  if (!token) throw new HubspotError("HubSpot token is not configured. Reopen the preview for simulation.", 503);
  if (!properties.email) throw new HubspotError("Email is required for live HubSpot export.", 400);
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const key = hash(token + properties.email);
  const fingerprint = hash(JSON.stringify(properties));
  for (const [id, entry] of submissions) if (entry.expires < Date.now()) submissions.delete(id);
  const existing = submissions.get(key);
  if (existing) {
    if (existing.fingerprint !== fingerprint) throw new HubspotError("An export for this email was just submitted. Wait one minute before exporting changed details.", 409);
    return existing.result;
  }
  if (submissions.size >= 500) throw new HubspotError("Export is busy. Try again in a minute.", 429);
  const result = send();
  submissions.set(key, { fingerprint, expires: Date.now() + 60000, result });
  try { return await result; }
  catch (error) { submissions.delete(key); throw error; }

  async function send(): Promise<HubspotResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000);
    const fetcher = options.fetcher ?? fetch;
    async function request(path: string, method: string, body?: unknown, allowNotFound = false) {
      const response = await fetcher(`https://api.hubapi.com/crm/v3/objects/contacts${path}`, {
        method, signal: controller.signal, cache: "no-store", redirect: "error",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (allowNotFound && response.status === 404) return null;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new HubspotError("HubSpot rejected the credentials or contact permissions. Check the server token and read/write scopes.", 502);
        if (response.status === 429) throw new HubspotError("HubSpot rate limit reached. Wait before retrying.", 429);
        if (response.status === 409) throw new HubspotError("HubSpot reports an existing contact conflict. Retry to look up the contact again.", 409);
        throw new HubspotError(`HubSpot ${method === "PATCH" ? "update" : path === "/search" ? "search" : method === "GET" ? "lookup" : "create"} failed. Retry after checking HubSpot.`, 502);
      }
      return response.json();
    }
    try {
      const found = searchSchema.parse(await request("/search", "POST", {
        filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: properties.email }] }],
        properties: ["email"], limit: 2,
      }));
      if (found.total > 1 || found.results.length > 1) throw new HubspotError("Multiple HubSpot contacts match this email. Review them in HubSpot before retrying.", 409);
      let id = found.results[0]?.id;
      // Search indexing may lag behind a recent create. Direct email lookup avoids blind retries.
      if (!id) {
        const direct = await request(`/${encodeURIComponent(properties.email!)}?idProperty=email`, "GET", undefined, true);
        if (direct !== null) id = recordSchema.parse(direct).id;
      }
      const record = recordSchema.parse(await request(id ? `/${encodeURIComponent(id)}` : "", id ? "PATCH" : "POST", { properties }));
      return { mode: "live", properties, outcome: id ? "updated" : "created", contactId: record.id };
    } catch (error) {
      if (error instanceof HubspotError) throw error;
      throw new HubspotError(controller.signal.aborted ? "HubSpot export timed out. It may have completed; retry will check email before writing." : "HubSpot returned an invalid response or could not be reached. Retry will check email before writing.");
    } finally { clearTimeout(timer); }
  }
}
