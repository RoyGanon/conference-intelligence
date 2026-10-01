"use client";
import { useEffect, useRef, useState } from "react";
import { hubspotResponseSchema, type HubspotContact, type HubspotResponse } from "@/lib/hubspot";
import type { QualificationResponse } from "@/lib/qualification";

const labels = { firstname: "First name", lastname: "Last name", email: "Email", company: "Company", jobtitle: "Job title" };

export function HubspotExport({ contact, qualification }: { contact: HubspotContact; qualification?: QualificationResponse }) {
  const [preview, setPreview] = useState<HubspotResponse>();
  const [result, setResult] = useState<HubspotResponse>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function submit(action: "preview" | "live" | "simulate") {
    if (active.current || (action !== "preview" && (!preview || result))) return;
    const controller = new AbortController(); active.current = controller;
    const timer = setTimeout(() => controller.abort(), 30000);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/hubspot/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, contact }), signal: controller.signal });
      let body: unknown;
      try { body = await response.json(); } catch { throw new Error("Export returned invalid JSON. Reopen the preview and retry."); }
      if (!response.ok) throw new Error(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "HubSpot export failed. Please retry.");
      const parsed = hubspotResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("Export response failed validation. Reopen the preview and retry.");
      if ((action === "preview" && parsed.data.outcome !== "preview") ||
        (action === "simulate" && parsed.data.outcome !== "simulated") ||
        (action === "live" && parsed.data.outcome !== "created" && parsed.data.outcome !== "updated")) {
        throw new Error("Export response does not match the requested action. Reopen the preview and retry.");
      }
      if (action === "preview") { setPreview(parsed.data); setResult(undefined); }
      else setResult(parsed.data);
    } catch (failure) {
      setError(controller.signal.aborted ? "Request timed out or was cancelled. A live export may have completed; retry checks email first." : failure instanceof Error ? failure.message : "Export failed.");
    } finally { clearTimeout(timer); active.current = null; setBusy(false); }
  }

  return <section className="mt-8 space-y-4 rounded-xl border border-slate-200 p-5" aria-busy={busy}>
    <h3 className="text-lg font-semibold">HubSpot</h3>
    <p className="text-sm text-slate-600">Review contact details before explicitly confirming an export. Sales intelligence and conference notes stay in Grain.</p>
    {!preview && <button disabled={busy} onClick={() => submit("preview")} className="rounded-lg bg-[#294b25] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Preparing preview…" : "Push to HubSpot"}</button>}
    {preview && <div className="space-y-4">
      <h4 className="font-semibold">HubSpot Export Preview</h4>
      <p className="rounded-lg bg-slate-100 p-3 text-sm font-semibold">{preview.mode === "live" ? "Live HubSpot export · Sends contact details to HubSpot on confirmation" : "Preview / Simulation · Demo mode · No HubSpot token configured"}</p>
      <p className="font-semibold">{contact.name}</p>
      <h5 className="text-sm font-semibold">{preview.mode === "live" ? "Will export" : "Would export in live mode"}</h5>
      <dl className="space-y-2 text-sm">{Object.entries(labels).map(([key, label]) => <div key={key} className="grid grid-cols-1 gap-1 sm:grid-cols-2"><dt>{label}</dt><dd className="min-w-0 font-medium [overflow-wrap:anywhere]">{preview.properties[key as keyof typeof labels] || "Not available — omitted"}</dd></div>)}</dl>
      <p className="text-xs text-slate-500">The first word of the saved name maps to first name; remaining words map to last name. Review this assumption. Available fields replace the same fields on an existing email match; omitted fields are never cleared. Company is contact text, not a synchronized company record.</p>
      <h5 className="text-sm font-semibold">Sales intelligence retained in Grain Conference Intelligence</h5>
      {qualification ? <dl className="space-y-2 text-sm"><div><dt>Priority {qualification.mode === "demo" && "(Demo AI analysis)"}</dt><dd className="capitalize">{qualification.analysis.priority}</dd></div><div><dt>Relationship status</dt><dd className="capitalize">{qualification.analysis.relationshipStatus.replaceAll("_", " ")}</dd></div><div><dt>Suggested next action</dt><dd>{qualification.analysis.suggestedNextAction}</dd></div></dl> : <p className="text-sm text-slate-600">Priority, relationship status and suggested next action are unavailable until you analyze this relationship.</p>}
      <p className="text-xs text-slate-500">No AI output, score, meeting history, notes or local IDs are sent to HubSpot. Export does not save or change local contacts, meetings or qualification.</p>
      {!contact.email && <p className="text-sm font-semibold text-amber-800">Email is required for live HubSpot export. This contact has no email; live export is disabled. A demo simulation may still be previewed.</p>}
      {!result && <div className="flex flex-wrap gap-3"><button disabled={busy || (preview.mode === "live" && !contact.email)} onClick={() => submit(preview.mode === "live" ? "live" : "simulate")} className="rounded-lg bg-[#294b25] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Processing…" : preview.mode === "live" ? "Confirm live export" : "Confirm simulated export"}</button><button disabled={busy} onClick={() => { setPreview(undefined); setError(""); }} className="rounded-lg border px-4 py-3 text-sm">Close preview</button></div>}
    </div>}
    <div role="status" aria-live="polite">{result && <div className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold">{result.mode === "simulation" ? "Demo mode · Simulated HubSpot export · No contact sent to HubSpot" : <>✓ Exported · {result.outcome === "created" ? "Created contact" : "Updated existing contact"}<br />Contact ID: {result.contactId}</>}</div>}</div>
    {error && <p role="alert" className="text-sm text-red-800">{error} Saved contacts, meetings and qualification are unaffected.</p>}
  </section>;
}
