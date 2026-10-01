import { ConferenceDiscovery } from "@/components/conferences/conference-discovery";
import { demoConferences } from "@/lib/demo-fixtures";
import { scoreConference } from "@/lib/conference-scoring";

export default function Page() {
  return <ConferenceDiscovery conferences={demoConferences.map(conference => ({
    conference, scoring: scoreConference(conference),
  }))} />;
}

