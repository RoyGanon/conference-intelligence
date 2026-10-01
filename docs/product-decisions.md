# Product and architecture decisions

## Explicit HubSpot contact export — October 1, 2026
- Relationships offers Push to HubSpot → human-readable preview → explicit confirmation → visible live or simulated status. Preview is core; live export is optional. No HubSpot API request occurs before confirmation. Demo simulation is explicitly labeled Simulated HubSpot export and never returns a real contact ID.
- A shared deterministic mapping exports only firstname, lastname, email, company and jobtitle. Contact stores one full name: first word becomes firstname, remainder lastname; the assumption is disclosed before confirmation. Missing optional values are omitted to preserve existing CRM data. Present values overwrite matching standard fields. Company remains contact text, with no company synchronization or associations.
- Current AI priority, relationship status and suggested action appear as retained context, with demo qualification labeled. AI output, score, notes, history and internal IDs are excluded from both the export request and provider payload. No AI logic, contact matching, scoring, planning, entity contract, database schema or capture persistence changed.
- Live requires email and server-only HUBSPOT_ACCESS_TOKEN with contact read/write scopes. The server searches exact normalized email, then directly looks up email if search is empty to account for indexing lag. It updates the returned ID or creates when both lookups find nothing. Multiple matches and create conflicts produce visible errors rather than another blind create. Contact ID is returned and shown, not added to the existing Contact model.
- Explicit user-triggered export keeps the salesperson in control of CRM writes and avoids treating this MVP as a CRM. Full sync would require identity ownership, conflict policy, durable export tracking, protected workspace access and operational infrastructure. OAuth, deals, pipelines, company sync, background jobs, webhooks and bidirectional sync remain out of scope.
- The UI guards concurrent submission and disables confirmation after success. A bounded process-local one-minute cache shares identical in-flight/completed exports by hashed token/email/payload; different details for the same email receive a conflict. Failed operations can be retried. These guards are not durable or distributed idempotency; email uniqueness and repeated lookup provide additional protection across reloads/processes. Timeouts can follow successful provider writes and this uncertainty is disclosed.
- Export writes no local Contacts, Interactions or Qualification. Status is transient, scoped to the selected contact/history, and resets on navigation/reload. Missing/invalid credentials, request limits, missing email, rate limits, malformed responses, create/update failures and timeout are visible errors. Live failures never become simulated success.
- Token and provider requests are confined to a server-only module. No provider error bodies or secrets are logged/returned. Same-origin POST checks, bounded input, no-store responses and a 25-second provider timeout follow the existing minimal architecture. Authentication remains absent: protect any live deployment before exposing privileged writes; origin checks alone cannot authorize users.

## AI Relationship Intelligence — October 1, 2026
- Relationships now offers an explicit Analyze relationship action. No analysis runs on page load. Results are transient and reset when the selected profile/history changes; no qualification table or persistence was added.
- AI is appropriate for semantic interpretation of unstructured salesperson notes: business relevance, pain, intent, engagement progression and recommended next steps. Conference ICP scoring, planning rules and contact identity matching remain deterministic and explainable; their implementations and entity contracts are unchanged.
- A server-only module behind POST /api/relationships/analyze calls OpenAI Responses with strict structured output, a centralized prompt, store:false and a 25-second timeout. OPENAI_API_KEY and OPENAI_MODEL are server environment variables. Browser requests contain only name/company/role and dated conference notes, omitting email and internal IDs. Notes and profile fields are untrusted data, never instructions. Output is validated again with strict Zod before returning and displaying it.
- Output includes priority (low/medium/high), integer score 0–100, relationshipStatus (new/developing/warming/stalled/insufficient_evidence), reasons, progressionSummary, suggestedNextAction and missingEvidence. Score is a prioritization aid, not conversion probability. Meeting count and elapsed time alone cannot establish warming or stalled. Role/company names do not prove payment operations or decision authority.
- With no key, exact seeded profile/history pairs replay authored deterministic qualification fixtures, explicitly labeled Demo AI analysis. Existing Sarah Cohen/Northstar fixtures already supply budget ownership, EUR/USD supplier FX pain and later demo interest; Harbor Software Sarah illustrates insufficient evidence. Shared TypeScript and SQL fixtures were preserved. Custom or edited histories receive an explicit unevaluated mock with score 0; this is not a live assessment. Live failures remain errors and never silently fall back to mock success.
- Loading, retry, invalid output, refusal and timeout states do not write to contact/interaction storage. Sales must review suggestions; nothing sends email or performs follow-up.
- This remains a local demo with no authentication. Same-origin checks and input limits are included, but do not provide access control or distributed rate limiting. Protect the endpoint with authentication and usage controls before a public live deployment. Live analysis sends profile/notes to OpenAI; the UI discloses this before the action. Schema validation verifies shape, not factual correctness or complete prompt-injection resistance. No live-provider accuracy claim is made.

## Approved scope — October 1, 2026
The initial phase established the foundation only, with six explicit placeholder routes. Conference discovery and scoring are now implemented as described below. Capture persistence, matching, AI calls, and HubSpot calls remain deferred.

## Minimal architecture
- Next.js App Router, TypeScript, Tailwind, Zod, and Supabase Postgres.
- One application and three tables: conferences, contacts, interactions.
- Attendance status lives on conferences because the MVP has one salesperson/workspace. A team model would require revisiting this.
- No repositories, service framework, separate backend, database client, or auth infrastructure in this phase.
- Zod schemas are the source of TypeScript data types. SQL uses snake_case; a mapping will be added when persistence is implemented.
- Scores and tiers are derived, avoiding stored values that drift from scoring configuration.
- Tailwind is sufficient for the shell. Add selected shadcn components when actual forms/dialogs justify them.
- System fonts avoid a build-time Google Fonts network dependency.
- The application runs without external credentials.

## Conference discovery and ICP scoring — October 1, 2026
Conference discovery now displays the 12 existing synthetic fixtures, with combined search, vertical, region, and derived-tier filters. Events remain visible regardless of date. Results rank by score descending, then start date and ID for deterministic ties.

Scoring is a pure function in `src/lib/conference-scoring.ts`, with no persistence or external discovery. Raw scores use 0–100 and weights are vertical 40%, target audience 30%, audience size 15%, geography 15%. Sum weighted contributions, then round once to the nearest integer. Tier A starts at 80; B starts at 60; C is below 60. The existing `ConferenceScore` contract is preserved; an extended derived type exposes weighted contributions.

Demo assumptions (not validated business policy): vertical scores are fintech 100, ecommerce 85, travel 70, SaaS 40. Target audience fit is the existing fixture value. Audience-size bands are 1,000+ = 100, 500–999 = 80, 250–499 = 60, 1–249 = 40, zero = 0. Market priorities are Southeast England 100, Benelux 85, Central Israel 80, US Northeast 75, San Francisco Bay Area 60. Geography is a market preference, not travel distance. Each card exposes raw scores, weights, contributions, explanations, and rounding.

## Identity and interpretation
Deterministic code will determine identity and persist interaction history. Exact email uniqueness is enforced by the database. Similar names are allowed and are never a uniqueness constraint. Uncertain matches require Same Person / Different Person. AI will interpret notes, buying intent, relationship progression, and next actions; it will never decide identity.

## Planning
Trip opportunities will use same city OR the same explicit nearby-region grouping within the configured time window. Groupings are conservative demo assumptions in src/lib/geography.ts; no maps API or distance inference. Trip logic is implemented in the pure planning module.

## Integration priorities
HubSpot payload preview belongs to the core MVP. Live export is a stretch goal after the complete core workflow works. Environment entries reserve future configuration only; no integrations are active.

## Data and safety
All fixtures are fictional, with .example email domains. Events span 2026–2027 and include a three-meeting progression, ambiguous identities, and nearby-region examples. TypeScript fixtures and SQL seed must be updated together.
RLS is enabled with no public policies; browser database access is denied. A protected server entry point is required before real data or privileged mutations are exposed. No service-role token may reach the browser.
SQL migration is supplied for manual application; no remote database has been configured or migrated.

## Quality and trade-offs
Reliable end-to-end behavior takes priority over test infrastructure. Foundation checks: ESLint, TypeScript, production build, schema validation of fixtures, and HTTP checks of all routes. No testing framework is installed.
Authentication, multi-tenancy, live discovery, OCR, offline capture, maps, automatic merging, and CRM synchronization remain out of scope.



## Parallel feature integration review — October 1, 2026
Conference, Planning, and UI agents worked on isolated features; the Lead Agent reviewed their combined repository.
- Planning calls the shared deterministic scoreConference function directly. No caller-supplied or hardcoded tier map remains. This prevents newly planned conferences from being omitted from Tier-A opportunities.
- Trips require two planned Tier-A events, same city/country OR same predefined nearby region, and start dates no more than seven days apart. UTC date arithmetic avoids DST differences. Cross-quarter pairs are included; cross-year pairs are outside the selected yearly plan.
- Coverage checks configured strategic verticals per start-date quarter. Planning mutations are page-local React state: they reset on reload/navigation and do not update the dashboard's fixture snapshot. Persistence is deferred.
- The dashboard's conference counts, selections, and tier badges derive from fixtures and shared scoring at a fixed October 1, 2026 snapshot. Relationship status, follow-ups, and editorial notes remain explicitly illustrative; no relationship or AI engine was introduced.
- Conference and Planning reuse the UI Agent's TierBadge, with consistent tier colors. No broad component abstraction or new dependencies were added.
- Business rules remain in pure lib modules. UI owns filters, selection, presentation, and page-local state.
- Shared TypeScript/Zod contracts and database schema remain unchanged.

## Quick Capture and factual Relationships — October 1, 2026
- /leads accepts conference context via conferenceId; name and conference are required. Optional fields remain immediately available. Zod validates capture and stored entities.
- Contact remains a person; every capture appends one Interaction. Existing contacts are preserved when selected, including company/role/email. Profile editing and historical employment snapshots are deferred; a job change is an identity-review signal, not an automatic profile update.
- Matching is pure deterministic code: NFKC, case and whitespace normalization; name punctuation cleanup; a small explicit alias map (Jon/Jonathan, Johnny/John, Sara/Sarah). Exact email is strong; recognized name plus company is probable; recognized name plus different company is possible; name alone is weak. Unrecognized names without a shared email are separate identities. Reasons accompany all candidates; no statistical percentages.
- All candidates, including exact-email matches, require an explicit Same person selection. Different person creates a new contact and leaves existing contacts unchanged. An email already owned by another contact must be removed/corrected before creating a separate identity, preserving SQL uniqueness semantics.
- No runtime Supabase client exists. A small browser-local demo adapter seeds from the unchanged fixtures and persists contacts/interactions across routes/reloads. No new database architecture or migrations. Browser storage is demo-only, not a protected production persistence layer. No synchronization across devices; simultaneous writes across tabs can race. Corrupt or unavailable storage causes a visible error rather than silent data replacement. Dashboard remains a fixture snapshot.
- UUID submission identifiers deduplicate retries of the same capture; separate intentional captures remain separate meetings. Matching and save re-read current persisted data. Notes render as text, without interpretation.
- Existing Sarah/Sara fixtures support multiple candidates and Same/Different demonstrations; nickname, Alex Brown, job change and email edge cases are covered in focused tests without modifying shared fixtures or SQL seeds.
- Timeline uses occurredAt (capture time), oldest first, with UTC date formatting. Selecting a past/future conference does not fabricate a meeting date inside its scheduled dates.

## Relationship integration review — October 1, 2026
The Lead Agent reviewed the Relationship Agent's deterministic matching, browser-local capture, and factual timeline against the existing conference/planning/dashboard work.
- Timeline and match-history ordering now compare parsed timestamp instants, with an ID tie-breaker, instead of sorting ISO strings. This handles timezone offsets correctly without mutating source lists.
- Capture and Relationships share only a UI field class; Relationships no longer imports the capture workspace for styling.
- Conference/contact URL context is handled as a single string and keys the workspace, so navigation to a different context does not retain the previous selection. Repeated query parameters are ignored rather than passed as arrays.
- Browser-local state rejects duplicate normalized emails in addition to schema, ID, and reference validation. Capture-another storage failures show an error and preserve the saved meeting.
- Matching remains deliberately conservative: normalized names and listed aliases only, not arbitrary typo/fuzzy similarity. All candidates require an explicit decision. No AI or HubSpot code was added.
- Same Person keeps contact profile details unchanged; a new interaction records capture time and notes. Different Person with an already-owned email is blocked until the email is corrected or removed.
- Existing fixture/SQL data and TypeScript entity contracts remain unchanged. Browser demo storage and cross-tab write races remain limitations; dashboard statistics still use the fixed fixture snapshot.

## AI integration review — October 1, 2026
- AI interprets the current contact profile and dated notes only. Identity matching, conference scoring, and planning remain independent deterministic modules. Qualification never writes Contacts or Interactions.
- A single strict Zod output schema supplies the provider JSON schema, server validation, client validation, and inferred types. Fields include priority, integer 0–100 prioritization score, relationshipStatus, reasons, progressionSummary, suggestedNextAction, and missingEvidence.
- Provider calls and environment variables remain in the server-only module/route. Production browser bundles were checked for provider URLs, key references, authorization headers, and the system prompt; none were found.
- Prompt instructions treat all supplied fields as untrusted data, require evidence and dated reasons, prohibit identity decisions and external company assumptions, and prohibit warming from meeting count alone. Prompting and schema validation do not prove semantic factuality or eliminate prompt injection; Sales must review the interpretation against the timeline. There are no model tools or autonomous actions.
- Missing API key selects explicitly labeled fixture replay. Exact seeded Sarah history yields high priority, 92/100, warming, and a treasury demo/discovery next action. Edited/custom histories return labeled insufficient evidence; they never inherit the canned Sarah result. Live failures never silently switch to demo.
- Fixed same-origin browser requests being rejected because Next's internal URL used a different hostname: compare the incoming Origin to the request Host and protocol. Foreign/malformed origins remain blocked. This is not authentication; protected deployment and usage controls are still required before exposing a live token publicly.
- UI handles non-JSON and malformed error responses with useful retry messages; the score label explicitly says Prioritization score. Capture copy now states capture itself uses no AI and optional analysis exists in Relationships.
- Input/response limits, provider timeout, refusal/incomplete-output checks, and no-store responses remain. Analysis results are transient and reset when the selected contact or factual history changes. No new persistence entity was added.
- Live provider behavior was verified with mocked fetch responses, not a real paid API request. Server/demo integration and loading/result states were checked in the browser. The exact untouched seeded Sarah story was verified in tests; existing browser Sarah data has additional demo meetings and correctly returns the custom-history fallback.

## Final MVP integration review — October 1, 2026
- HubSpot input reuses the core contact schema. Response validation enforces consistent mode/outcome/contact ID combinations; the client requires the outcome to match the requested action. Simulation cannot be displayed as a real CRM write.
- Export remains contact-only: preview never calls HubSpot, live requires email, lookup precedes update/create, and AI/history stay local. Provider failures cannot mutate captured data. Retry deduplication is process-local, not distributed protection against simultaneous creation.
- Removed stale foundation/pending-feature copy from the shell, capture, dashboard, Settings, and README. Settings describes environment configuration; it is not a configuration editor.
- Production browser review covered explained Tier-A score, planning add, conference-context capture, explicit Same Person, chronological timeline, labeled custom-history demo AI, preview, and simulated export. Different Person created a separate contact without changing candidates. Capture at 390px had no horizontal overflow.
- Submission scope remains a synthetic demo: browser-local contacts/interactions, transient planning and integration results, fixed dashboard snapshot, no runtime Supabase or authentication. Live account behavior and physical-device testing are unverified. Untouched seeded Sarah history demonstrates the authored warming result; new histories require live AI or manual review.

## Real conference data foundation — October 1, 2026
An additive migration adds lifecycle, independent review flags, source metadata, observations, and research run/lease storage. Existing UUIDs, fixture values, demo flags, and seed SQL are preserved. A separate StoredConference Zod/TypeScript contract permits unknown region/audience inputs; the runtime Conference contract stays complete and unchanged. No runtime imports, database connection, scheduled process, cron, or scoring changes were introduced.
The real-record source constraint is NOT VALID to preserve any pre-existing unsourced real rows; new and updated rows must have edition identity and source URL/name. Validate legacy rows before a real-data rollout. SQL checks JSON container shapes; detailed payload validation remains Zod's responsibility at future write boundaries. Revision/timestamps and lease fields are storage only: atomic acceptance, revision increment, lease acquisition/expiry handling are deferred. Migration execution in PostgreSQL remains unverified locally.

## Verified offline dataset — October 1, 2026
Eight upcoming official-source editions are stored separately from fixtures. Every accepted factual field carries attributed, timestamped paraphrased evidence; editorial country/vertical/region mappings are labeled. Fit scores stay null. Only an explicit current-edition numerical visitor target supplies the attendance scalar; lower bounds, historical results and ambiguous claims remain separate metadata. All editions are ICP incomplete without tiers. The manual SQL generator is insert-only, transactional, deterministic, and refuses conflicting existing facts; it has no database/network access. Existing application imports/scoring, fixtures, seed SQL and migration remain unchanged. See verified-real-conferences.md for sources, exclusions, and staging verification limitations.

## Target Audience Fit v1
The approved 60/45/30 + 25/15 + 15/10 rubric operates on reviewed evidence-linked tags, never runtime text/name matching. Each factor awards its maximum supported level once. Unknown is null, distinct from evidence-backed zero. Lower/zero complete assessments require explicit resolution evidence; higher levels cannot be ruled out merely by silence. Only reviewed, fully resolved assessments accept a numeric score. All eight real records retain null accepted scores with supported floors and unresolved-factor explanations. An additive metadata migration and offline import validation preserve versioned inputs/results; database execution remains unverified. No runtime scoring, fixture behavior, reads, scheduler or cron changes.
# Supabase read preparation — October 1, 2026

Runtime Conferences integration now uses request-time server reads with no-store fetches and explicit unavailable/empty states. Existing ICP weights/thresholds remain unchanged; only complete accepted audience assessments with all scoring inputs enter the shared scorer. Unknown values are displayed explicitly, without tiers or totals. Public evidence/verification timestamps and lifecycle/review flags remain visible. Other workflows retain demo IDs; omitted real-card capture links avoid silently selecting an unrelated demo conference. No database writes, migrations, automation or other page integration were added.

The isolated server-only conference reader uses native fetch without another SDK, performs only GETs, validates stored contracts and recomputes evidence-linked assessments. Missing configuration/provider/schema/validation failures return explicit unavailable states, never demo fallback. Accepted means a real row with a verification timestamp; cancelled and review-needed accepted records remain visible as factual states. No runtime page imports changed. Readiness column probes indicate schema compatibility, not proven migration history; a separate read-only SQL inspection covers constraints/indexes/RLS. Import SQL is generated offline; database execution remains manual and unverified without credentials.
