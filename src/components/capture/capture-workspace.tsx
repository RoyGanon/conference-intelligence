"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { captureInputSchema } from "@/lib/schemas";
import { matchContacts, type MatchCandidate } from "@/lib/contact-matching";
import { interactionConferenceName, type CaptureConference, chronologicalInteractions, readCaptureState, saveCapture, type CaptureState } from "@/lib/capture-store";
import type { CaptureInput } from "@/types";
import { EmptyState, SectionHeader, fieldClass as field } from "@/components/ui";

const button = "min-h-12 rounded-lg bg-[#294b25] px-5 py-3 font-semibold text-white disabled:opacity-50";
export function CaptureWorkspace({ conferenceId, conferences }: { conferenceId?: string; conferences: (CaptureConference & { startDate: string })[] }) {
  const [state, setState] = useState<CaptureState>();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<CaptureInput>();
  const [pending, setPending] = useState<CaptureInput>();
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [saved, setSaved] = useState("");
  const lock = useRef(false), token = useRef("");
  useEffect(() => { let active = true; Promise.resolve().then(() => { if (!active) return; try { setState(readCaptureState()); } catch { setError("Could not load saved contact data. Check browser storage access before capturing."); } }); return () => { active = false; }; }, []);
  function save(input: CaptureInput, decision: string) {
    if (lock.current) return;
    lock.current = true;
    try { setSaved(saveCapture(input, decision, token.current, conferences)); setPending(undefined); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save. Your form is still available; try again."); }
    finally { lock.current = false; }
  }
  return <section className="max-w-3xl space-y-6 [overflow-wrap:anywhere]">
    <SectionHeader title="Quick Capture" description="Save the meeting while it is fresh. Only name and conference are required." />
    <p className="text-xs text-slate-500">Real conferences · Contacts and meetings saved in this browser · Seeded demo contacts remain available · Capture uses no AI · Optional analysis and HubSpot export are available in Relationships</p>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {saved ? <div className="rounded-xl border border-emerald-200 bg-white p-6"><h2 role="status" className="text-xl font-semibold">Meeting saved</h2><p className="mt-2 text-sm text-slate-600">Your interaction is now part of this person’s conference history.</p><Link className="mt-5 inline-block font-semibold text-emerald-800 underline" href={`/relationships?contactId=${saved}`}>View relationship timeline →</Link><button className={`${button} mt-5 block`} onClick={() => { try { setState(readCaptureState()); setSaved(""); setDraft(undefined); setError(""); } catch { setError("Could not read browser storage. Your saved meeting was not changed."); } }}>Capture another meeting</button></div>
    : pending ? <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-xl font-semibold">Possible existing contact{matches.length > 1 ? "s" : ""}</h2>
      <p className="text-sm text-slate-600">Choose the person you met. Existing contact details stay unchanged; this adds a meeting.</p>
      {matches.map(match => <article key={match.contact.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
        <div><span className="text-xs font-semibold uppercase text-emerald-800">{match.level} match · {match.requiresReview ? "Review required" : "Exact email"}</span><h3 className="mt-2 font-semibold">{match.contact.name}</h3><p className="text-sm text-slate-600">{match.contact.company || "Company unknown"} · {match.contact.role || "Role unknown"}</p><p className="text-sm text-slate-500">{match.contact.email}</p></div>
        <div className="text-sm"><p className="font-medium">Why this may be the same person</p><ul className="ml-5 list-disc">{match.reasons.map(r => <li key={r}>{r}</li>)}</ul></div>
        <div className="text-sm text-slate-600"><p className="font-medium">Previously met</p>{chronologicalInteractions(state?.interactions.filter(i => i.contactId === match.contact.id) ?? []).map(i => <p key={i.id}>{interactionConferenceName(state, i.conferenceId, conferences)} — {new Date(i.occurredAt).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}</p>)}{!state?.interactions.some(i => i.contactId === match.contact.id) && <p>No previous meetings recorded</p>}</div>
        <button className={button} onClick={() => save(pending, match.contact.id)}>Same person<span className="sr-only">: {match.contact.name}, {match.contact.company}</span></button>
      </article>)}
      <button className="min-h-12 rounded-lg border border-slate-300 px-4 font-semibold" onClick={() => save(pending, "new")}>Different person — create a separate contact</button>
      <button className="block min-h-12 px-2 text-sm underline" onClick={() => { setPending(undefined); setError(""); }}>Back to edit</button>
    </div> : <form className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-7" onSubmit={e => {
      e.preventDefault(); setError("");
      const form = new FormData(e.currentTarget);
      const value = (key: string) => String(form.get(key) ?? "").trim();
      const parsed = captureInputSchema.safeParse({ conferenceId: value("conferenceId"), name: value("name"), company: value("company") || undefined, role: value("role") || undefined, email: value("email") || undefined, notes: value("notes"), occurredAt: new Date().toISOString() });
      if (!parsed.success) { setError(parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(" · ")); return; }
      try { const fresh = readCaptureState(); setState(fresh); token.current = crypto.randomUUID(); const found = matchContacts(parsed.data, fresh.contacts); setDraft(parsed.data); setMatches(found); if (found.length) setPending(parsed.data); else save(parsed.data, "new"); } catch { setError("Could not read demo storage. Your capture has not been saved."); }
    }}>
      <label className="block text-sm font-semibold">Conference *<select name="conferenceId" required defaultValue={draft?.conferenceId ?? (conferences.some(c => c.id === conferenceId) ? conferenceId : "")} className={field}><option value="">Select conference</option>{conferences.map(c => <option key={c.id} value={c.id}>{c.name} · {c.startDate}</option>)}</select></label>
      <label className="block text-sm font-semibold">Name *<input name="name" defaultValue={draft?.name} autoComplete="name" required maxLength={160} className={field} placeholder="Sarah Cohen" /></label>
      <label className="block text-sm font-semibold">Company<input name="company" defaultValue={draft?.company} autoComplete="organization" maxLength={160} className={field} placeholder="Northstar Commerce" /></label>
      <label className="block text-sm font-semibold">Notes<textarea name="notes" defaultValue={draft?.notes} rows={3} maxLength={5000} className={field} placeholder="What did you discuss?" /></label>
      <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">Email <span className="font-normal text-slate-500">(optional)</span><input name="email" defaultValue={draft?.email} type="email" autoComplete="email" maxLength={254} className={field} /></label><label className="text-sm font-semibold">Role <span className="font-normal text-slate-500">(optional)</span><input name="role" defaultValue={draft?.role} autoComplete="organization-title" maxLength={160} className={field} /></label></div>
      <button disabled={!state} className={`${button} w-full`} type="submit">Save meeting</button>
    </form>}
    {!saved && <EmptyState title="Try the demo" description="Enter Sarah Cohen at Northstar Commerce to review multiple candidates, or Sarah Cohen at GlobalPay to demonstrate a possible job change. Choose Same person to extend the timeline, or Different person to keep identities separate." />}
  </section>;
}


