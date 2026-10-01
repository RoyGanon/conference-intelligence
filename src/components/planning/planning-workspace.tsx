"use client";

import { useState } from "react";
import { demoConferences } from "@/lib/demo-fixtures";
import { buildYearlyPlan, quarters, setConferencePlanned } from "@/lib/planning";
import { defaultStrategicVerticals } from "@/lib/planning-demo";
import { scoreConference } from "@/lib/conference-scoring";
import { TierBadge } from "@/components/ui";
import { verticalSchema } from "@/lib/schemas";
import type { Conference, Vertical } from "@/types";

const controlClass = "rounded-lg border border-[#b9c9ae] px-3 py-2 text-sm font-medium hover:bg-[#edf3e7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#526c38]";
const panelClass = "rounded-2xl border border-[#dfe5dc] bg-white p-5";

function ConferenceRow({ conference, onToggle }: { conference: Conference; onToggle: (conference: Conference) => void }) {
  const planned = conference.attendanceStatus === "planned";
  return <li className="flex flex-wrap items-center justify-between gap-4 border-t border-[#edf0e9] py-4 first:border-t-0">
    <div>
      <h3 className="font-semibold">{conference.name}</h3>
      <p className="mt-1 text-sm text-[#65756b]">{conference.startDate} – {conference.endDate} · {conference.city}, {conference.country}</p>
      <div className="mt-2 flex items-center gap-2 text-xs text-[#65756b]">{conference.vertical} · ICP {scoreConference(conference).score}/100 <TierBadge tier={scoreConference(conference).tier} /></div>
    </div>
    <button type="button" className={controlClass} onClick={() => onToggle(conference)}
      aria-label={`${planned ? "Remove" : "Add"} ${conference.name} ${planned ? "from" : "to"} yearly plan`}>
      {planned ? "Remove from plan" : "Add to plan"}
    </button>
  </li>;
}

export function PlanningWorkspace() {
  const [conferences, setConferences] = useState<Conference[]>(demoConferences);
  const [year, setYear] = useState(2026);
  const [strategicVerticals, setStrategicVerticals] = useState<Vertical[]>([...defaultStrategicVerticals]);
  const years = [...new Set(demoConferences.map(conference => Number(conference.startDate.slice(0, 4))))].sort();
  const plan = buildYearlyPlan(conferences, { year, strategicVerticals });
  const available = conferences.filter(conference => Number(conference.startDate.slice(0, 4)) === year
    && conference.attendanceStatus === "unplanned").sort((a, b) => a.startDate.localeCompare(b.startDate));
  function toggleConference(conference: Conference) {
    setConferences(current => setConferencePlanned(current, conference.id, conference.attendanceStatus !== "planned"));
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
    <p className="mt-3 max-w-3xl text-sm leading-6 text-[#65756b]">Add conferences to shape quarterly coverage and find opportunities to combine trips. Changes reset when you leave this page or reload.</p>
    <p className="mt-2 text-xs leading-5 text-[#65756b]">Synthetic demo data: tiers use the same deterministic ICP scoring as Conferences. Quarters and trip spacing use conference start dates. Regions use predefined nearby groupings.</p>
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
          <ConferenceRow key={conference.id} conference={conference} onToggle={toggleConference} />)}</ul>
          : <p className="mt-4 text-sm text-[#65756b]">No conferences planned for this quarter.</p>}
      </section>)}
    </div>
    <section className={`${panelClass} mt-6`} aria-labelledby="available-heading">
      <h2 id="available-heading" className="text-xl font-semibold">Available conferences · {year}</h2>
      {available.length ? <ul className="mt-3">{available.map(conference =>
        <ConferenceRow key={conference.id} conference={conference} onToggle={toggleConference} />)}</ul>
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
