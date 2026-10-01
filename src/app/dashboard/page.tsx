import Link from "next/link";
import { scoreConference } from "@/lib/conference-scoring";
import { EmptyState, InsightCard, MetricCard, ScoreBadge, SectionHeader, TierBadge } from "@/components/ui";
import { dashboardDemo as demo } from "./demo-view";

const linkStyle = "text-sm font-semibold text-emerald-800 hover:underline underline-offset-4";
const panel = "min-w-0 rounded-xl border border-slate-200 bg-white p-5 sm:p-6";
const date = (value: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));

export default function DashboardPage() {
  return <div className="space-y-7">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Your sales workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1><p className="mt-2 text-sm leading-6 text-slate-600">Plan your next conversation. Keep promising relationships moving.</p></div>
      <Link href="/leads" className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">Open quick capture ↗</Link>
    </div>
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900"><strong>Demo workspace</strong> · Fixed snapshot: {demo.asOf}. All records are fictional. ICP tiers use shared deterministic scoring. Warming status, actions, and editorial notes are illustrative previews.</div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Upcoming planned" value={demo.upcoming.length} detail="In this demo snapshot" />
      <MetricCard label="Tier-A opportunities" value={demo.opportunities.length} detail="Upcoming events · shared ICP scoring" />
      <MetricCard label="Captured contacts" value={demo.contactCount} detail="Across the existing demo dataset" />
      <MetricCard label="Follow-up actions" value={demo.followUps.length} detail="Example actions · task tracking pending" />
    </div>
    <div className="grid items-start gap-6 xl:grid-cols-[1.25fr_1fr]">
      <section className={panel}>
        <SectionHeader title="Upcoming planned conferences" description="Your next stop in the demo calendar" action={<Link className={linkStyle} href="/planning">View planning →</Link>} />
        {demo.upcoming.map(event => <article key={event.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-semibold text-emerald-800">{date(event.startDate)} – {date(event.endDate)}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">Planned</span></div><h3 className="mt-3 font-semibold text-slate-900">{event.name}</h3><p className="mt-1 text-sm text-slate-500">{event.city}, {event.country} · Fintech</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-600">{event.estimatedAudienceSize.toLocaleString("en-GB")} estimated attendees</span><ScoreBadge score={event.targetAudienceFit} label="Audience fit" /></div></article>)}
        <p className="mt-4 text-xs leading-5 text-slate-500">One planned event remains after the snapshot date. Review other opportunities to expand the calendar.</p>
      </section>
      <section className={panel}>
        <SectionHeader title="Tier-A opportunities" description="Upcoming events ranked as Tier A by shared ICP scoring" action={<Link className={linkStyle} href="/conferences">Browse events →</Link>} />
        <ul className="divide-y divide-slate-100">{demo.opportunities.map(event => <li key={event.id} className="py-4 first:pt-0 last:pb-0"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold leading-6 text-slate-900">{event.name}</h3><TierBadge tier={scoreConference(event).tier} /></div><p className="mt-1 text-xs text-slate-500">{date(event.startDate)} · {event.city}</p><p className="mt-3 text-xs text-slate-600">Attendance: {event.attendanceStatus} · ICP {scoreConference(event).score}/100</p></li>)}</ul>
      </section>
      <section className={panel}>
        <SectionHeader title="Recently captured contacts" description="Latest captures in the demo dataset" action={<Link className={linkStyle} href="/leads">View contacts →</Link>} />
        <ul className="divide-y divide-slate-100">{demo.recentContacts.map(contact => <li key={contact.id} className="py-4 first:pt-0 last:pb-0"><h3 className="text-sm font-semibold text-slate-900">{contact.name}</h3><p className="mt-1 text-xs leading-5 text-slate-600">{contact.role} · {contact.company}</p><p className="mt-1 text-xs text-slate-500">Captured {date(contact.createdAt)}</p></li>)}</ul>
      </section>
      <section className={panel}>
        <SectionHeader title="Warming relationships" description="Fixture preview · analyze current history in Relationships" action={<Link className={linkStyle} href="/relationships">View relationships →</Link>} />
        <div className="border-l-2 border-amber-400 pl-4"><p className="text-xs font-semibold text-amber-800">Warming · Demo example</p><h3 className="mt-2 text-sm font-semibold text-slate-900">{demo.warming.name}</h3><p className="mt-1 text-xs text-slate-500">{demo.warming.role} · {demo.warming.company}</p><p className="mt-3 text-sm leading-6 text-slate-600">Asked for a product demo with the treasury team at the September summit.</p><p className="mt-3 text-xs font-medium text-slate-600">3 recorded conference conversations</p></div>
      </section>
    </div>
    <section className={panel}>
      <SectionHeader title="Follow-up actions" description="Example actions for this preview; no tasks have been created" />
      <div className="grid gap-4 md:grid-cols-2">{demo.followUps.map(action => <article key={action.contact.id} className="rounded-lg border border-slate-200 p-4"><p className="text-xs text-slate-500">Demo example</p><h3 className="mt-2 text-sm font-semibold text-slate-900">{action.title}</h3><p className="mt-1 text-xs text-emerald-800">{action.contact.name} · {action.contact.company}</p><p className="mt-3 text-sm leading-6 text-slate-600">{action.detail}</p></article>)}</div>
    </section>
    <section><SectionHeader title="Planning insights" description="Editorial demo notes for conference preparation" /><div className="grid gap-4 md:grid-cols-3"><InsightCard title="Prepare for Tel Aviv">Fintech Operations Exchange is planned for 10–11 November. Review your target accounts before attending.</InsightCard><InsightCard title="Review the October calendar">Commerce Finance Sessions is on 24 October in San Jose and is currently unplanned. Review its audience and travel requirements.</InsightCard><EmptyState title="Explore planning insights" description="Open Planning for deterministic trip opportunities and quarterly coverage gaps." action={<Link className={linkStyle} href="/planning">Open planning →</Link>} /></div></section>
  </div>;
}


