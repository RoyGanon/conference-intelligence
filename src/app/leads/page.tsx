import { CaptureWorkspace } from "@/components/capture/capture-workspace";
export default async function Page({ searchParams }: { searchParams: Promise<{ conferenceId?: string | string[] }> }) {
  const value = (await searchParams).conferenceId;
  const conferenceId = typeof value === "string" ? value : undefined;
  return <CaptureWorkspace key={conferenceId ?? "default"} conferenceId={conferenceId} />;
}

