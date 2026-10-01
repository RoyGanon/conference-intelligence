# Grain Conference Intelligence

Single-workspace sales conference MVP demo. Includes deterministic ICP scoring, page-local yearly planning, browser-local Quick Capture and contact matching, cross-conference Relationships, optional server-side AI analysis, and HubSpot preview/simulated export with optional live export. Dashboard uses a fixed fixture snapshot; Settings is an informational placeholder.

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
RLS denies browser access. Future server routes will use server-only configuration after access protection is implemented. The current app does not connect to Supabase; applying SQL does not connect the application to the database.
Keep secrets in .env.local or deployment environment settings. Never commit keys or expose the service-role key using NEXT_PUBLIC_.

## Deployment
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

