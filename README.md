# Grain Conference Intelligence

Grain Conference Intelligence helps salespeople choose relevant conferences and keep track of the relationships they build there. It connects event prioritization, meeting capture, and cross-conference contact history so Sales can review buying intent, decide a next action, and prepare a contact for HubSpot.

This single-workspace MVP uses synthetic conference data and browser-local captures. It runs without credentials, with clearly labeled demo relationship analysis and simulated export; live AI and HubSpot export require server configuration. Dashboard uses a fixed fixture snapshot; Settings is an informational placeholder.

## Core workflow

**Discover → Plan → Capture → Match → Understand → Export**

- **Discover:** Compare demo conferences using deterministic ICP scores and explanations.
- **Plan:** Add events to a yearly plan and review quarterly coverage and nearby trip opportunities. Planning edits reset on navigation or reload.
- **Capture:** Record a person's name, conference, and optional details and meeting notes in Quick Capture.
- **Match:** Review explained deterministic candidates. Choose Same Person to add an interaction to an existing contact, or Different Person to create a separate contact.
- **Understand:** Review the factual cross-conference timeline and request relationship analysis and a suggested next action. Demo analysis replays seeded histories; custom histories return insufficient evidence without live AI.
- **Export:** Preview the HubSpot contact payload, then explicitly confirm a simulated export or, with credentials and an email, a live contact export.

## Run locally
Requires Node.js 20.9+ and npm.

1. Run `npm install`.
2. Optionally copy `.env.example` to `.env.local`. No credentials are required to run the demo.
3. Run `npm run dev`.
4. Open http://localhost:3000 (redirects to /dashboard).

Checks: `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
Production: `npm run build`, then `npm start`.

## Structure
- src/app: application pages and server-only qualification/export API routes
- src/components: shared layout/UI, capture, relationship intelligence, and export presentation
- src/types: types inferred from Zod plus a derived score contract
- src/lib/schemas.ts: entity and capture-input validation
- src/lib/demo-fixtures.ts: 12 fictional conferences, 4 contacts, 6 meetings
- src/lib/geography.ts: predefined nearby-region groupings
- supabase/migrations: three-table Postgres schema
- supabase/seed.sql: optional fictional seed data
- docs/product-decisions.md: scope, assumptions, and trade-offs
- docs/ai-usage.md: ongoing development AI usage log

## Supabase setup (optional, manual)
In a new Supabase project's SQL Editor, run supabase/migrations/202610010001_foundation.sql, then optionally supabase/seed.sql. The migration is intended for a fresh database; the seed is repeatable by ID. A local CLI configuration is not required.
RLS denies browser access. Conferences now reads accepted real records through the server-only Supabase reader. Configure the server variables and apply all three migrations plus the verified import as documented below. Without Supabase, Conferences shows an explicit unavailable state. Other pages continue using their existing demo data.
Keep secrets in .env.local or deployment environment settings. Never commit keys or expose the service-role key using NEXT_PUBLIC_.

## Deployment
Supabase conference schema/import preparation and read-only readiness checks are documented in [Supabase conference setup](docs/supabase-conference-setup.md). Incomplete real ICP inputs show unknown values and no tier; evidence-supported audience floors remain separate from accepted scores. Planning and Quick Capture still use the demo dataset, so real conference cards do not link into demo capture.

Deploy as a standard Next.js application on Vercel with default build settings. The demo needs no environment variables. Use synthetic data for public demos; protect the deployment before enabling real contact data or privileged server mutations.

## Not implemented
Database persistence, planning persistence, and authentication. Capture/matching and factual Relationships use browser-local demo storage; optional AI qualification and HubSpot contact export run through separate server routes.


Scoring verification: `node scripts/check-conference-scoring.cjs`. Planning tests: `node --test tests/planning.test.mjs`.
Planning edits reset on reload/navigation; dashboard conference facts use a fixed October 1, 2026 fixture snapshot.


## Relationship analysis
Without OPENAI_API_KEY, Analyze Relationship returns explicitly labeled demo replay for exact seeded profiles/histories; custom histories return insufficient evidence. Live analysis requires server-only OPENAI_API_KEY and OPENAI_MODEL. Never expose a live token on an unprotected public deployment. Analysis is optional and cannot change saved meetings or contacts. Qualification checks: `node --test tests/qualification.test.mjs`.

## HubSpot contact export
In Relationships, select a contact and click **Push to HubSpot**. Review the payload, then explicitly confirm. No HubSpot request occurs while previewing. Without credentials, **Confirm simulated export** produces **Simulated HubSpot export** and sends nothing to HubSpot; it never returns a real contact ID.

For live export, configure a HubSpot private app token with `crm.objects.contacts.read` and `crm.objects.contacts.write` scopes as `HUBSPOT_ACCESS_TOKEN` in `.env.local` or server deployment settings, then restart the server. Never use a `NEXT_PUBLIC_` variable. Protect the deployment before enabling the token: this local MVP has no authentication; same-origin checking is not access control.

Email is required for live export. The preview maps the first word of the full name to `firstname`, the remainder to `lastname`, email to normalized `email`, company to contact `company` text, and role to `jobtitle`. Empty optional fields are omitted. Available fields overwrite those fields on an existing email match. AI priority, status, next action, scores and conference notes stay in Grain. Review the name split before confirmation.

The server searches by email, checks direct email lookup if search returns nothing, then updates by ID or creates a contact. Success displays the returned HubSpot ID. Credentials/provider bodies are never returned to the browser. Buttons prevent concurrent submission; identical retries are deduplicated for one minute within one server process. Success/status is page-local and resets on navigation or reload; no CRM persistence, background sync or distributed idempotency is added. Timeouts may occur after a provider write; retry searches email again. No real account is required for checks: `node --test tests/*.test.mjs`, `node scripts/check-conference-scoring.cjs`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.

API reference: [HubSpot contact API](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/contacts/guide).

## Offline real-conference dataset

Eight official-source editions were researched on October 1, 2026 and the developer reports the initial import is in production. The local approved review completes five audience assessments; only FinTech Connect has every input for ICP 100/Tier A. Those review changes await manual database application using `supabase/reviewed-target-audience-update.sql`. See [the research report and instructions](docs/verified-real-conferences.md). Validate offline with `node scripts/prepare-real-conferences.cjs`; no database writes occur. Synthetic fixtures and scoring methodology remain unchanged.

