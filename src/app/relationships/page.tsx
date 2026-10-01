import { RelationshipsWorkspace } from "@/components/capture/relationships-workspace";
export default async function Page({ searchParams }: { searchParams: Promise<{ contactId?: string | string[] }> }) {
  const value = (await searchParams).contactId;
  const contactId = typeof value === "string" ? value : undefined;
  return <RelationshipsWorkspace key={contactId ?? "default"} contactId={contactId} />;
}

