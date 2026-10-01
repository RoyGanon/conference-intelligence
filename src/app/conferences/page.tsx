import { ConferenceDiscovery } from "@/components/conferences/conference-discovery";
import { readAcceptedRealConferences } from "@/lib/conferences-server";
import { prepareConferenceDiscovery } from "@/lib/conference-discovery-data";
import { EmptyState } from "@/components/ui";
import { connection } from "next/server";

export default async function Page() {
  await connection();
  const data = await readAcceptedRealConferences();
  if (data.status === "unavailable") return <div className="space-y-6"><h1 className="text-3xl font-semibold">Conferences</h1><div role="alert"><EmptyState title="Real conferences unavailable" description="We could not load verified conference data. Please try again later. No demo conferences are shown." action={<a href="/conferences" className="underline">Retry loading conferences</a>} /></div></div>;
  return <ConferenceDiscovery conferences={data.conferences.map(prepareConferenceDiscovery)} />;
}

