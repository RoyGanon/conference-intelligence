import { demoConferences, demoContacts } from "@/lib/demo-fixtures";
import { scoreConference } from "@/lib/conference-scoring";
// Fixed-date snapshot; conference facts derive from shared fixtures/scoring.
// Relationship statuses and actions remain explicitly illustrative.
const snapshotDate = "2026-10-01";
export const dashboardDemo = {
  asOf: "1 October 2026",
  upcoming: demoConferences.filter(c => c.attendanceStatus === "planned" && c.startDate >= snapshotDate).toSorted((a, b) => a.startDate.localeCompare(b.startDate)),
  opportunities: demoConferences.filter(c => c.startDate >= snapshotDate && scoreConference(c).tier === "A").toSorted((a, b) => a.startDate.localeCompare(b.startDate)),
  recentContacts: demoContacts.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
  contactCount: demoContacts.length,
  warming: demoContacts[0],
  followUps: [
    { contact: demoContacts[0], title: "Coordinate a treasury team demo", detail: "Confirm availability and the topics to cover." },
    { contact: demoContacts[1], title: "Clarify payment requirements", detail: "Ask about currencies, payment volume, and decision timing." },
  ],
};
