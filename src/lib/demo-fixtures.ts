import { z } from "zod";
import { conferenceSchema, contactSchema, interactionSchema } from "./schemas";
// Entirely fictional events and people. Reserved .example emails cannot target real recipients.
export const demoConferences = z.array(conferenceSchema).parse([
  {
    "id": "10000000-0000-4000-8000-000000000001",
    "name": "Cross-Border Finance Forum",
    "startDate": "2026-02-12",
    "endDate": "2026-02-13",
    "city": "London",
    "country": "UK",
    "region": "uk-southeast",
    "vertical": "fintech",
    "estimatedAudienceSize": 1800,
    "targetAudienceFit": 92,
    "attendanceStatus": "planned",
    "isDemo": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000002",
    "name": "Merchant Growth Exchange",
    "startDate": "2026-02-17",
    "endDate": "2026-02-18",
    "city": "Reading",
    "country": "UK",
    "region": "uk-southeast",
    "vertical": "ecommerce",
    "estimatedAudienceSize": 650,
    "targetAudienceFit": 86,
    "attendanceStatus": "planned",
    "isDemo": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000003",
    "name": "Treasury Leaders Assembly",
    "startDate": "2026-05-19",
    "endDate": "2026-05-20",
    "city": "Amsterdam",
    "country": "Netherlands",
    "region": "benelux",
    "vertical": "fintech",
    "estimatedAudienceSize": 2400,
    "targetAudienceFit": 95,
    "attendanceStatus": "planned",
    "isDemo": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000004",
    "name": "Digital Commerce Roundtable",
    "startDate": "2026-05-23",
    "endDate": "2026-05-23",
    "city": "Rotterdam",
    "country": "Netherlands",
    "region": "benelux",
    "vertical": "ecommerce",
    "estimatedAudienceSize": 450,
    "targetAudienceFit": 80,
    "attendanceStatus": "unplanned",
    "isDemo": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000005",
    "name": "Global Travel Operators Forum",
    "startDate": "2026-08-11",
    "endDate": "2026-08-12",
    "city": "New York",
    "country": "USA",
    "region": "us-northeast",
    "vertical": "travel",
    "estimatedAudienceSize": 1200,
    "targetAudienceFit": 78,
    "attendanceStatus": "unplanned",
    "isDemo": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000006",
    "name": "Payments & Treasury Summit",
    "startDate": "2026-09-15",
    "endDate": "2026-09-17",
    "city": "London",
    "country": "UK",
    "region": "uk-southeast",
    "vertical": "fintech",
    "estimatedAudienceSize": 3200,
    "targetAudienceFit": 96,
    "attendanceStatus": "planned",
    "isDemo": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000007",
    "name": "SaaS Revenue Collective",
    "startDate": "2026-10-20",
    "endDate": "2026-10-21",
    "city": "San Francisco",
    "country": "USA",
    "region": "us-west",
    "vertical": "saas",
    "estimatedAudienceSize": 1500,
    "targetAudienceFit": 65,
    "attendanceStatus": "unplanned",
    "isDemo": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000008",
    "name": "Commerce Finance Sessions",
    "startDate": "2026-10-24",
    "endDate": "2026-10-24",
    "city": "San Jose",
    "country": "USA",
    "region": "us-west",
    "vertical": "ecommerce",
    "estimatedAudienceSize": 500,
    "targetAudienceFit": 88,
    "attendanceStatus": "unplanned",
    "isDemo": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000009",
    "name": "Fintech Operations Exchange",
    "startDate": "2026-11-10",
    "endDate": "2026-11-11",
    "city": "Tel Aviv",
    "country": "Israel",
    "region": "israel-central",
    "vertical": "fintech",
    "estimatedAudienceSize": 900,
    "targetAudienceFit": 90,
    "attendanceStatus": "planned",
    "isDemo": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000010",
    "name": "Travel Payments Workshop",
    "startDate": "2026-11-14",
    "endDate": "2026-11-14",
    "city": "Herzliya",
    "country": "Israel",
    "region": "israel-central",
    "vertical": "travel",
    "estimatedAudienceSize": 250,
    "targetAudienceFit": 82,
    "attendanceStatus": "unplanned",
    "isDemo": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000011",
    "name": "International Merchant Forum",
    "startDate": "2027-02-09",
    "endDate": "2027-02-10",
    "city": "Brussels",
    "country": "Belgium",
    "region": "benelux",
    "vertical": "ecommerce",
    "estimatedAudienceSize": 1100,
    "targetAudienceFit": 85,
    "attendanceStatus": "unplanned",
    "isDemo": true
  },
  {
    "id": "10000000-0000-4000-8000-000000000012",
    "name": "B2B Finance Leadership Day",
    "startDate": "2027-03-16",
    "endDate": "2027-03-16",
    "city": "Newark",
    "country": "USA",
    "region": "us-northeast",
    "vertical": "saas",
    "estimatedAudienceSize": 350,
    "targetAudienceFit": 70,
    "attendanceStatus": "unplanned",
    "isDemo": true
  }
]);
export const demoContacts = z.array(contactSchema).parse([
  {
    "id": "20000000-0000-4000-8000-000000000001",
    "name": "Sarah Cohen",
    "email": "sarah.cohen@northstar-demo.example",
    "company": "Northstar Commerce",
    "role": "VP Finance",
    "createdAt": "2026-02-12T10:00:00Z",
    "updatedAt": "2026-09-16T14:30:00Z"
  },
  {
    "id": "20000000-0000-4000-8000-000000000002",
    "name": "Daniel Reed",
    "email": "daniel.reed@atlas-demo.example",
    "company": "Atlas Travel Group",
    "role": "Treasury Manager",
    "createdAt": "2026-08-11T15:00:00Z",
    "updatedAt": "2026-08-11T15:00:00Z"
  },
  {
    "id": "20000000-0000-4000-8000-000000000003",
    "name": "Sara Cohen",
    "email": null,
    "company": "Northstar Commerce",
    "role": "Finance Operations Lead",
    "createdAt": "2026-05-19T11:00:00Z",
    "updatedAt": "2026-05-19T11:00:00Z"
  },
  {
    "id": "20000000-0000-4000-8000-000000000004",
    "name": "Sarah Cohen",
    "email": "sarah@harbor-demo.example",
    "company": "Harbor Software",
    "role": "Product Manager",
    "createdAt": "2026-09-15T09:00:00Z",
    "updatedAt": "2026-09-15T09:00:00Z"
  }
]);
export const demoInteractions = z.array(interactionSchema).parse([
  {
    "id": "30000000-0000-4000-8000-000000000001",
    "contactId": "20000000-0000-4000-8000-000000000001",
    "conferenceId": "10000000-0000-4000-8000-000000000001",
    "occurredAt": "2026-02-12T10:00:00Z",
    "notes": "Quick introduction. Northstar sells in the UK and Europe. Sarah asked what Grain does.",
    "createdAt": "2026-02-12T10:00:00Z"
  },
  {
    "id": "30000000-0000-4000-8000-000000000002",
    "contactId": "20000000-0000-4000-8000-000000000001",
    "conferenceId": "10000000-0000-4000-8000-000000000003",
    "occurredAt": "2026-05-20T13:00:00Z",
    "notes": "Discussed EUR and USD supplier payments and unpredictable FX costs. Sarah owns the finance budget; wants to compare options.",
    "createdAt": "2026-05-20T13:00:00Z"
  },
  {
    "id": "30000000-0000-4000-8000-000000000003",
    "contactId": "20000000-0000-4000-8000-000000000001",
    "conferenceId": "10000000-0000-4000-8000-000000000006",
    "occurredAt": "2026-09-16T14:30:00Z",
    "notes": "Interested in a product demo with the treasury team next week. Asked about implementation time and pricing. No purchase commitment yet.",
    "createdAt": "2026-09-16T14:30:00Z"
  },
  {
    "id": "30000000-0000-4000-8000-000000000004",
    "contactId": "20000000-0000-4000-8000-000000000002",
    "conferenceId": "10000000-0000-4000-8000-000000000005",
    "occurredAt": "2026-08-11T15:00:00Z",
    "notes": "International bookings and supplier payments in several currencies. Daniel gathers requirements; CFO approves. No budget or timeline confirmed.",
    "createdAt": "2026-08-11T15:00:00Z"
  },
  {
    "id": "30000000-0000-4000-8000-000000000005",
    "contactId": "20000000-0000-4000-8000-000000000003",
    "conferenceId": "10000000-0000-4000-8000-000000000003",
    "occurredAt": "2026-05-19T11:00:00Z",
    "notes": "Sara works in finance operations at Northstar. Asked for a one-page overview; no specific pain shared.",
    "createdAt": "2026-05-19T11:00:00Z"
  },
  {
    "id": "30000000-0000-4000-8000-000000000006",
    "contactId": "20000000-0000-4000-8000-000000000004",
    "conferenceId": "10000000-0000-4000-8000-000000000006",
    "occurredAt": "2026-09-15T09:00:00Z",
    "notes": "Sarah works on product at Harbor Software. General networking conversation; no finance responsibilities identified.",
    "createdAt": "2026-09-15T09:00:00Z"
  }
]);

