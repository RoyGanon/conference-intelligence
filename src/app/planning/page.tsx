import { PlanningWorkspace } from "@/components/planning/planning-workspace";
import { readAcceptedRealConferences } from "@/lib/conferences-server";
import { prepareConferenceDiscovery } from "@/lib/conference-discovery-data";
import { EmptyState } from "@/components/ui";
import { connection } from "next/server";
export default async function Page({ searchParams }: { searchParams: Promise<{ conferenceId?: string | string[] }> }) {
  await connection();
  const raw = (await searchParams).conferenceId;
  const value = typeof raw === "string" ? raw : undefined;
  const data = await readAcceptedRealConferences();
  if (data.status === "unavailable") return <div role="alert"><EmptyState title="Real conferences unavailable" description="Could not load verified conferences. No synthetic choices are shown." action={<a href="/planning" className="underline">Retry</a>} /></div>;
  if (!data.conferences.length) return <EmptyState title="No accepted real conferences" description="No verified conference choices are available yet." />;
  return <PlanningWorkspace key={value ?? "default"} conferenceId={value} conferences={data.conferences.map(prepareConferenceDiscovery)} />;
}
