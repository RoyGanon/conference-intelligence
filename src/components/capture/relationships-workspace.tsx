"use client";
import Link from "next/link";
import { RelationshipIntelligence } from "./relationship-intelligence";
import { useEffect, useState } from "react";
import { chronologicalInteractions, readCaptureState, type CaptureState } from "@/lib/capture-store";
import { demoConferences } from "@/lib/demo-fixtures";
import { normalizeIdentity } from "@/lib/contact-matching";
import { EmptyState, SectionHeader, fieldClass as field } from "@/components/ui";

export function RelationshipsWorkspace({ contactId }: { contactId?: string }) {
  const [state, setState] = useState<CaptureState>();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(contactId ?? "");
  const [query, setQuery] = useState("");
  useEffect(() => { const refresh = () => { try { setState(readCaptureState()); setError(""); } catch { setError("Could not load relationship history. Check browser storage access or saved demo data."); } }; refresh(); window.addEventListener("storage", refresh); return () => window.removeEventListener("storage", refresh); }, []);
  const contacts = state?.contacts.filter(c => normalizeIdentity(`${c.name} ${c.company ?? ""} ${c.role ?? ""} ${c.email ?? ""}`).includes(normalizeIdentity(query))).sort((a,b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)) ?? [];
  const contact = state?.contacts.find(c => c.id === selected);
  const interactions = chronologicalInteractions(state?.interactions.filter(i => i.contactId === selected) ?? []);
  return <section className="space-y-6 [overflow-wrap:anywhere]"><SectionHeader title="Relationships" description="People you have met. A factual history across conferences." action={<Link className="rounded-lg bg-[#294b25] px-4 py-3 text-sm font-semibold text-white" href="/leads">Quick Capture</Link>} />
    <p className="text-xs text-slate-500">Synthetic demo + meetings saved in this browser · Oldest meeting first</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)]">
      <aside className="rounded-xl border border-slate-200 bg-white p-4"><label className="text-sm font-semibold">Search contacts<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, company, role or email" className={field} /></label><p role="status" className="my-4 text-xs text-slate-500">{state ? `${contacts.length} contacts` : "Loading history…"}</p><div className="space-y-2">{contacts.map(c => <button key={c.id} aria-pressed={selected === c.id} onClick={() => setSelected(c.id)} className={`block min-h-16 w-full rounded-lg border p-3 text-left ${selected === c.id ? "border-emerald-700 bg-emerald-50" : "border-slate-200"}`}><span className="block font-semibold">{c.name}</span><span className="text-sm text-slate-600">{c.company || "Company unknown"}</span></button>)}{state && !contacts.length && <EmptyState title="No contacts found" description="Try another name or company." />}</div></aside>
      {contact ? <article className="rounded-xl border border-slate-200 bg-white p-5 sm:p-7"><h2 className="text-2xl font-semibold">{contact.name}</h2><p className="mt-2 text-slate-600">{contact.role || "Role unknown"} · {contact.company || "Company unknown"}</p>{contact.email && <p className="mt-1 text-sm text-slate-500">{contact.email}</p>}<h3 className="mt-8 text-sm font-semibold">Conference timeline · {interactions.length} meeting{interactions.length === 1 ? "" : "s"}</h3><ol className="mt-5 space-y-6 border-l-2 border-emerald-200 pl-5">{interactions.map(i => <li key={i.id}><time dateTime={i.occurredAt} className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{new Date(i.occurredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</time><h4 className="mt-2 font-semibold">{demoConferences.find(c => c.id === i.conferenceId)?.name}</h4><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{i.notes || "No notes recorded."}</p><Link className="mt-2 inline-block text-xs text-emerald-800 underline" href={`/leads?conferenceId=${i.conferenceId}`}>Capture at this conference</Link></li>)}</ol>{!interactions.length && <EmptyState title="No meetings yet" description="Capture a meeting to start this relationship’s history." />}<RelationshipIntelligence exportContact={{ name: contact.name, email: contact.email, company: contact.company, role: contact.role }} key={JSON.stringify({ contact, interactions })} input={{ contact: { name: contact.name, company: contact.company, role: contact.role }, interactions: interactions.map(i => ({ occurredAt: i.occurredAt, conference: demoConferences.find(c => c.id === i.conferenceId)?.name ?? "Unknown conference", notes: i.notes })) }} /></article> : <EmptyState title={contactId && state ? "Select a contact" : "Explore a relationship"} description="Select a person to see every recorded conference meeting and its notes." />}
    </div></section>;
}

