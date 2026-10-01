import { RelationshipsWorkspace } from "@/components/capture/relationships-workspace";
import { readAcceptedRealConferences } from "@/lib/conferences-server";
import { connection } from "next/server";
export default async function Page({ searchParams }: { searchParams: Promise<{ contactId?: string | string[] }> }) {
  await connection();
  const raw = (await searchParams).contactId;
  const value = typeof raw === "string" ? raw : undefined;
  const data = await readAcceptedRealConferences();
  if (data.status === "unavailable") return <RelationshipsWorkspace contactId={value} conferences={[]} conferencesUnavailable />;
  return <RelationshipsWorkspace key={value ?? "default"} contactId={value} conferences={data.conferences.map(({ conference: c }) => ({ id: c.id, name: c.name }))} />;
}
