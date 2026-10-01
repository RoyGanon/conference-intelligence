"use client";
import { useState } from "react";
import { geographicRegions } from "@/lib/geography";
import { scoringFactors } from "@/lib/conference-scoring";
import { filterDiscoveryConferences, type DiscoveryConference } from "@/lib/conference-discovery-data";
import { EmptyState, TierBadge } from "@/components/ui";

const verticalLabels = { fintech: "Fintech", ecommerce: "Ecommerce", travel: "Travel", saas: "SaaS" };
const inputLabels = { estimatedAudienceSize: "Audience size", targetAudienceFit: "Accepted target audience fit", region: "Scoring region" };
const fieldStyle = "mt-2 block min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
export function ConferenceDiscovery({ conferences }: { conferences: DiscoveryConference[] }) {
  const [search, setSearch] = useState("");
  const [vertical, setVertical] = useState("");
  const [region, setRegion] = useState("");
  const [tier, setTier] = useState("");
  const resetFilters = () => { setSearch(""); setVertical(""); setRegion(""); setTier(""); };
  const visible = filterDiscoveryConferences(conferences, { search, vertical, region, tier });
  return <div className="space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Discover & prioritize</p><h1 className="mt-2 text-3xl font-semibold md:text-4xl">Conferences</h1><p className="mt-3 text-sm text-slate-600">Find events closest to your ideal customer profile. Review published facts and the evidence behind audience fit.</p><p className="mt-3 text-xs text-slate-500">Real conferences · Public-source evidence · Complete ICP scores ranked first, then event date</p><p className="mt-2 text-xs text-slate-500">Planning and Quick Capture currently use the separate demo dataset.</p></div>
    <details className="rounded-xl border border-slate-200 bg-[#eef3e7] p-4 text-sm"><summary className="cursor-pointer font-semibold">How ICP scoring works</summary><div className="mt-3 space-y-2 leading-6"><p>Total = vertical × 40% + accepted target audience fit × 30% + audience size × 15% + geography × 15%, rounded once. Tier A: 80–100 · Tier B: 60–79 · Tier C: below 60.</p><p>Missing inputs or incomplete audience assessments mean ICP incomplete: no total or tier. Unknown evidence is never scored as zero. Supported audience floors are evidence-backed minimums, not accepted audience scores or overall ICP scores.</p><p>Configured vertical priorities: fintech 100, ecommerce 85, travel 70, SaaS 40.</p><p>Audience size: 1,000+ = 100; 500–999 = 80; 250–499 = 60; 1–249 = 40; explicitly published zero = 0.</p><p>Geography: Southeast England 100, Benelux 85, Central Israel 80, US Northeast 75, San Francisco Bay Area 60. These are configured market priorities, not distance calculations.</p></div></details>
    <section aria-label="Conference filters" className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-semibold">Search conferences or locations<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, city, country…" className={fieldStyle} /></label>
      <label className="text-xs font-semibold">Vertical<select className={fieldStyle} value={vertical} onChange={e => setVertical(e.target.value)}><option value="">All verticals</option>{Object.entries(verticalLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-xs font-semibold">Geography<select className={fieldStyle} value={region} onChange={e => setRegion(e.target.value)}><option value="">All regions</option>{Object.entries(geographicRegions).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}<option value="unknown">Region unknown / unmapped</option></select></label>
      <label className="text-xs font-semibold">ICP tier<select className={fieldStyle} value={tier} onChange={e => setTier(e.target.value)}><option value="">All tiers / incomplete</option><option value="A">A · 80–100</option><option value="B">B · 60–79</option><option value="C">C · Below 60</option><option value="incomplete">ICP incomplete</option></select></label>
    </section>
    <div className="flex justify-between text-sm"><p role="status">{visible.length} of {conferences.length} conferences</p>{(search || vertical || region || tier) && <button onClick={resetFilters} className="underline">Clear filters</button>}</div>
    {!conferences.length ? <EmptyState title="No accepted real conferences" description="The database returned no verified real conference records." /> : !visible.length ? <EmptyState title="No conferences match these filters" description="Try a broader search or clear your filters." action={<button onClick={resetFilters} className="underline">Clear filters</button>} /> :
      <div className="grid items-start gap-4 md:grid-cols-2">{visible.map(item => {
        const { conference: c, scoring } = item;
        return <article key={c.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="p-5"><div className="flex flex-wrap justify-between gap-2"><span className="text-xs uppercase">{verticalLabels[c.vertical]}</span>{scoring ? <TierBadge tier={scoring.tier} /> : <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">ICP incomplete</span>}</div>
            <h2 className="mt-4 break-words text-lg font-semibold">{c.name}</h2>
            <p className="mt-2 text-sm text-slate-600"><time dateTime={c.startDate}>{c.startDate}</time>{c.endDate !== c.startDate && ` – ${c.endDate}`}</p>
            <p className="mt-1 text-sm text-slate-600">{c.city}, {c.country} · {c.region ? geographicRegions[c.region].label : "Region unknown / unmapped"}</p>
            <p className="mt-2 text-xs capitalize">{c.lifecycleStatus}{c.needsReview && " · Needs review"}</p>{c.needsReview && <p className="mt-1 text-xs text-amber-900">{c.reviewReason}</p>}
            <div className="mt-5 flex flex-wrap justify-between gap-4 border-t pt-4"><div><p className="text-xs">Expected audience</p><p>{c.estimatedAudienceSize === null ? "Unknown / not reliably published" : `${c.estimatedAudienceSize.toLocaleString("en-US")} attendees`}</p></div><div><p className="text-xs">ICP score</p><p className="text-lg font-semibold">{scoring ? `${scoring.score} / 100` : "ICP incomplete"}</p></div></div>
            <p className="mt-3 text-xs">Accepted target audience fit: {c.targetAudienceFit === null ? "Unknown / assessment incomplete" : `${c.targetAudienceFit}/100`}</p>
            <p className="mt-2 text-xs text-slate-500">Last verified: {c.lastVerifiedAt ?? "Unknown"} · Last checked: {c.lastCheckedAt ?? "Unknown"}</p>
            {c.sourceUrl && <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block break-words text-sm text-[#294b25] underline">Official source: {c.sourceName}</a>}
          </div>
          <details className="border-t bg-[#fafbf8] p-5"><summary className="cursor-pointer text-sm font-semibold text-[#294b25]">{scoring ? "Why this score?" : "Why is ICP incomplete?"} <span className="sr-only">{c.name}</span></summary>
            {scoring ? <><ul className="mt-4 space-y-4">{scoring.breakdown.map(part => <li key={part.factor}><div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-semibold">{scoringFactors[part.factor].label} · {part.weight * 100}%</span><span>{part.rawScore}/100 → <strong>{part.weightedContribution.toFixed(2)} points</strong></span></div><p className="mt-2 text-xs leading-5 text-slate-600">{part.reason}</p></li>)}</ul><p className="mt-4 text-xs">Weighted sum {scoring.breakdown.reduce((sum, part) => sum + part.weightedContribution, 0).toFixed(2)} → {scoring.score}/100 → Tier {scoring.tier}.</p></> : <div className="mt-4 space-y-3 text-sm"><p>Missing scoring inputs: {item.missingInputs.map(field => inputLabels[field]).join(", ") || "Audience assessment approval"}.</p><p>Supported target audience floor: {item.supportedScoreFloor === null ? "Unknown" : `${item.supportedScoreFloor}/100`} — not an accepted score.</p>{item.unresolvedFactors.map(part => <p key={part.factor}><strong className="capitalize">{part.factor}:</strong> {part.reason}</p>)}{item.pendingReview && <p>Audience assessment review is pending.</p>}<p className="break-words text-xs text-slate-500">Rubric: {item.rubricVersion ?? "Not assessed"}</p></div>}
            <div className="mt-4 space-y-3 border-t pt-3"><p className="text-xs font-semibold">Accepted source evidence</p>{Object.entries(c.acceptedEvidence).map(([field, evidence]) => <div key={field} className="text-xs leading-5"><p className="font-semibold">{field}</p><p>{evidence.excerpt}</p><a href={evidence.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-words text-[#294b25] underline">{evidence.sourceName}</a><p className="text-slate-500">Checked {evidence.checkedAt}</p></div>)}</div>
          </details>
        </article>;
      })}</div>}
  </div>;
}
