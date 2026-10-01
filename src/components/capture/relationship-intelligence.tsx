"use client";
import { useEffect, useRef, useState } from "react";
import { qualificationResponseSchema, type QualificationInput, type QualificationResponse } from "@/lib/qualification";
import { HubspotExport } from "./hubspot-export";
import type { HubspotContact } from "@/lib/hubspot";

export function RelationshipIntelligence({ input, exportContact }: { input: QualificationInput; exportContact: HubspotContact }) {
  const [result, setResult] = useState<QualificationResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function analyze() {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller;
    const timer = setTimeout(() => controller.abort(), 30000);
    setLoading(true); setError(""); setUnavailable(false); setResult(undefined);
    try {
      const response = await fetch("/api/relationships/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: controller.signal });
      let body: unknown;
      try { body = await response.json(); }
      catch { throw new Error("Analysis returned invalid JSON. Please retry."); }
      if (!response.ok) {
        setUnavailable(Boolean(body && typeof body === "object" && "code" in body && body.code === "ai_not_configured"));
        const message = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "Analysis failed. Please retry.";
        throw new Error(message);
      }
      const parsed = qualificationResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("Analysis output failed validation. Please retry.");
      setResult(parsed.data);
    } catch (failure) { setError(controller.signal.aborted ? "Analysis timed out or was cancelled. Please retry." : failure instanceof Error ? failure.message : "Analysis failed. Please retry."); }
    finally { clearTimeout(timer); active.current = null; setLoading(false); }
  }
  const analysis = result?.analysis;
  return <><section className="mt-8 space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-5" aria-busy={loading}>
    <h3 className="text-lg font-semibold">AI Relationship Intelligence</h3>
    <p className="text-sm text-slate-600">Analyze the current profile and recorded history to help decide what to do next. With live AI configured, these details and notes are sent to OpenAI when you click. Without a key, only unchanged seeded relationships support demo replay; custom histories require live AI.</p>
    <button disabled={loading} onClick={analyze} className="rounded-lg bg-[#294b25] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Analyzing relationship…" : error ? "Retry analysis" : result ? "Analyze again" : "Analyze relationship"}</button>
    <p role="status" className="text-sm font-semibold">{loading ? "Analyzing current relationship history…" : unavailable ? "AI unavailable · no analysis performed" : result ? result.mode === "demo" ? "Demo AI analysis · seeded demo replay" : "Live AI analysis" : "Analysis runs only when requested."}</p>
    {error && <p role="alert" className="text-sm text-red-800">{error} Saved contacts and meetings are unaffected.</p>}
    {analysis && <div className="space-y-4 text-sm">
      <dl className="grid gap-3 sm:grid-cols-3"><div><dt className="text-slate-600">Priority</dt><dd className="font-semibold capitalize">{analysis.priority}</dd></div><div><dt className="text-slate-600">Prioritization score</dt><dd className="font-semibold">{analysis.score}/100</dd></div><div><dt className="text-slate-600">Relationship status</dt><dd className="font-semibold capitalize">{analysis.relationshipStatus.replaceAll("_", " ")}</dd></div></dl>
      <p className="text-xs text-slate-500">Score is a prioritization aid, not a probability of conversion. Review this interpretation against the timeline.</p>
      <div><h4 className="font-semibold">Why</h4><ul className="mt-2 list-disc space-y-2 pl-5">{analysis.reasons.map((reason,index) => <li key={index}>{reason}</li>)}</ul></div>
      <div><h4 className="font-semibold">Relationship progression</h4><p className="mt-2">{analysis.progressionSummary}</p></div>
      <div><h4 className="font-semibold">Suggested next action</h4><p className="mt-2">{analysis.suggestedNextAction}</p></div>
      <div><h4 className="font-semibold">Missing evidence</h4>{analysis.missingEvidence.length ? <ul className="mt-2 list-disc space-y-2 pl-5">{analysis.missingEvidence.map((item,index) => <li key={index}>{item}</li>)}</ul> : <p className="mt-2">No additional gaps reported by this analysis.</p>}</div>
    </div>}
  </section><HubspotExport contact={exportContact} qualification={result} /></>;
}
