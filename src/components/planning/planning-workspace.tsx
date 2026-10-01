"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DiscoveryConference } from "@/lib/conference-discovery-data";
import { readPlannedIds, writePlannedIds } from "@/lib/planning-storage";
import { buildYearlyPlan, quarters } from "@/lib/planning";
import { defaultStrategicVerticals } from "@/lib/planning-demo";
import { TierBadge } from "@/components/ui";
import { verticalSchema } from "@/lib/schemas";
import type { Vertical } from "@/types";

const controlClass = "rounded-lg border border-[#b9c9ae] px-3 py-2 text-sm font-medium hover:bg-[#edf3e7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#526c38]";
const panelClass = "rounded-2xl border border-[#dfe5dc] bg-white p-5";

function ConferenceRow({ item, planned, disabled, onToggle }: { item: DiscoveryConference; planned: boolean; disabled: boolean; onToggle: (id: string) => void }) {
  const conference = item.conference;
  return <li className="flex flex-wrap items-center justify-between gap-4 border-t border-[#edf0e9] py-4 first:border-t-0">
    <div>
      <h3 className="font-semibold">{conference.name}</h3>
      <p className="mt-1 text-sm text-[#65756b]">{conference.startDate} – {conference.endDate} · {conference.city}, {conference.country}</p>
      <div className="mt-2 flex items-center gap-2 text-xs text-[#65756b]">{conference.vertical} · {item.scoring ? <>ICP {item.scoring.score}/100 <TierBadge tier={item.scoring.tier} /></> : "ICP incomplete"}</div>
      <p className="mt-1 text-xs text-[#65756b]">{conference.lifecycleStatus}{conference.needsReview && " · Needs review"} · {conference.region ?? "Geography unknown"}</p>
      <Link className="mt-2 inline-block text-sm underline" href={`/leads?conferenceId=${conference.id}`}>Capture Lead</Link>
    </div>
    <button type="button" disabled={disabled} className={`${controlClass} disabled:opacity-50`} onClick={() => onToggle(conference.id)}
      aria-label={`${planned ? "Remove" : "Add"} ${conference.name} ${planned ? "from" : "to"} yearly plan`}>
      {planned ? "Remove from plan" : "Add to plan"}
    </button>
  </li>;
}

export function PlanningWorkspace({ conferences: items, conferenceId }: { conferences: DiscoveryConference[]; conferenceId?: string }) {
  const [plannedIds, setPlannedIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const selected = items.find(item => item.conference.id === conferenceId)?.conference;
  const [year, setYear] = useState(Number((selected ?? items[0]?.conference)?.startDate.slice(0, 4)) || 2026);
  useEffect(() => { let active = true; Promise.resolve().then(() => { if (!active) return; try { setPlannedIds(readPlannedIds()); } catch { setStorageError("Could not load your browser plan. Saved selections were not overwritten."); } setReady(true); }); return () => { active = false; }; }, []);
  const conferences = items.map(item => ({ ...item.conference, attendanceStatus: plannedIds.includes(item.conference.id) ? "planned" as const : "unplanned" as const }));
  const [strategicVerticals, setStrategicVerticals] = useState<Vertical[]>([...defaultStrategicVerticals]);
  const years = [...new Set(conferences.map(conference => Number(conference.startDate.slice(0, 4))))].sort();
  const plan = buildYearlyPlan(conferences, { year, strategicVerticals }, conference => items.find(item => item.conference.id === conference.id)?.scoring?.tier ?? null);
  const available = conferences.filter(conference => Number(conference.startDate.slice(0, 4)) === year
    && conference.attendanceStatus === "unplanned").sort((a, b) => a.startDate.localeCompare(b.startDate));
  function toggleConference(id: string) {
    if (!ready || storageError) return;
    const next = plannedIds.includes(id) ? plannedIds.filter(value => value !== id) : [...plannedIds, id];
    try { writePlannedIds(next); setPlannedIds(next); } catch { setStorageError("Could not save your plan. Check browser storage access."); }
  }
  return <section>
    <p className="text-xs font-semibold uppercase tracking-widest text-[#6a824f]">Conference Planning</p>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Your yearly plan</h1>
      <label className="flex items-center gap-3 text-sm font-semibold">Plan year
        <select className={controlClass} value={year} onChange={event => setYear(Number(event.target.value))}>
          {years.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
    </div>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-[#65756b]">Add conferences to shape quarterly coverage and find opportunities to combine trips. Selections are saved in this browser across navigation and refresh.</p>
    <p className="mt-2 text-xs leading-5 text-[#65756b]">Real conference data: accepted scores use the same deterministic ICP scoring as Conferences. Incomplete ICP conferences cannot qualify for Tier A trip opportunities. Quarters and trip spacing use conference start dates. Regions use predefined nearby groupings.</p>
    {storageError && <p role="alert" className="mt-3 text-sm text-red-800">{storageError}</p>}
    {!ready && <p role="status" className="mt-3 text-sm">Loading saved plan…</p>}
    <fieldset className={`${panelClass} mt-6`}>
      <legend className="px-2 font-semibold">Strategic verticals</legend>
      <p className="text-sm text-[#65756b]">Check coverage for these verticals in every quarter.</p>
      <div className="mt-3 flex flex-wrap gap-5">
        {verticalSchema.options.map(vertical => <label key={vertical} className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#526c38]" checked={strategicVerticals.includes(vertical)}
            onChange={event => setStrategicVerticals(current => event.target.checked
              ? [...current, vertical] : current.filter(value => value !== vertical))} />{vertical}
        </label>)}
      </div>
    </fieldset>
    <div className="mt-8 flex items-baseline justify-between gap-4">
      <h2 className="text-xl font-semibold">Planned by quarter</h2>
      <p className="text-sm text-[#65756b]" aria-live="polite">{plan.planned.length} planned conferences</p>
    </div>
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      {quarters.map(quarter => <section key={quarter} className={panelClass} aria-labelledby={`quarter-${quarter}`}>
        <h2 id={`quarter-${quarter}`} className="font-semibold">Q{quarter} {year} <span className="font-normal text-[#65756b]">· {plan.byQuarter[quarter].length} planned</span></h2>
        {plan.byQuarter[quarter].length ? <ul className="mt-3">{plan.byQuarter[quarter].map(conference =>
          <ConferenceRow key={conference.id} item={items.find(item => item.conference.id === conference.id)!} planned={plannedIds.includes(conference.id)} disabled={!ready || Boolean(storageError)} onToggle={toggleConference} />)}</ul>
          : <p className="mt-4 text-sm text-[#65756b]">No conferences planned for this quarter.</p>}
      </section>)}
    </div>
    <section className={`${panelClass} mt-6`} aria-labelledby="available-heading">
      <h2 id="available-heading" className="text-xl font-semibold">Available conferences · {year}</h2>
      {available.length ? <ul className="mt-3">{available.map(conference =>
        <ConferenceRow key={conference.id} item={items.find(item => item.conference.id === conference.id)!} planned={plannedIds.includes(conference.id)} disabled={!ready || Boolean(storageError)} onToggle={toggleConference} />)}</ul>
        : <p className="mt-4 text-sm text-[#65756b]">All conferences for this year are in your plan.</p>}
    </section>
    <section className="mt-8" aria-labelledby="insights-heading">
      <h2 id="insights-heading" className="text-xl font-semibold">Planning insights</h2>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className={panelClass}>
          <h3 className="font-semibold">Trip opportunities ({plan.trips.length})</h3>
          <p className="mt-2 text-sm text-[#65756b]">Two planned Tier A conferences within 7 days in the same city or predefined region.</p>
          {plan.trips.length ? <ul className="mt-4 space-y-4">{plan.trips.map(trip => <li key={trip.id} className="rounded-xl bg-[#edf3e7] p-4">
            <h4 className="font-semibold">Trip Opportunity</h4>
            <p className="mt-2 text-sm font-medium">{trip.conferences[0].name} + {trip.conferences[1].name}</p>
            <p className="mt-2 text-sm">{trip.daysApart} {trip.daysApart === 1 ? "day" : "days"} apart · {trip.locationReason}</p>
            <p className="mt-2 text-xs leading-5 text-[#526c38]">Why: {trip.reason}</p>
          </li>)}</ul> : <p className="mt-4 text-sm text-[#65756b]">No qualifying conference pairs in this year’s plan.</p>}
        </section>
        <section className={panelClass}>
          <h3 className="font-semibold">Coverage gaps ({plan.gaps.length})</h3>
          {strategicVerticals.length === 0 && <p className="mt-3 text-sm text-[#65756b]">Select strategic verticals to check coverage.</p>}
          {plan.gaps.length ? <ul className="mt-4 space-y-3">{plan.gaps.map(gap => <li key={gap.id} className="rounded-xl bg-[#faf4e8] p-4">
            <h4 className="text-sm font-semibold">Coverage Gap · Q{gap.quarter} · {gap.vertical}</h4>
            <p className="mt-2 text-xs leading-5 text-[#76603b]">Why: {gap.reason}</p>
          </li>)}</ul> : strategicVerticals.length > 0 && <p className="mt-4 text-sm text-[#65756b]">Every configured vertical has a planned conference in every quarter.</p>}
        </section>
      </div>
    </section>
  </section>;
}
