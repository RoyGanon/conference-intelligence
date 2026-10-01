import type { ReactNode } from "react";
import type { Tier } from "@/types";

export const fieldClass = "mt-2 block min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-normal focus:outline-2 focus:outline-emerald-700";

export function MetricCard({ label, value, detail }: { label: string; value: ReactNode; detail: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></div>;
}
export function ScoreBadge({ score, label = "Score" }: { score: number; label?: string }) {
  return <span className="inline-flex gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{label} <strong>{score}/100</strong></span>;
}
const tierStyles: Record<Tier, string> = { A: "bg-[#eaf2df] text-[#294b25]", B: "bg-amber-50 text-amber-900", C: "bg-slate-100 text-slate-700" };
export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`inline-flex shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${tierStyles[tier]}`}>Tier {tier}</span>;
}
export function InsightCard({ title, children, label = "Planning note" }: { title: string; children: ReactNode; label?: string }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{label}</p><h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3><div className="mt-2 text-sm leading-6 text-slate-600">{children}</div></article>;
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5"><h3 className="text-sm font-semibold text-slate-800">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}
export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}</div>{action}</div>;
}
