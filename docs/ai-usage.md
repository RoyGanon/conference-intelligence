# AI usage log

## October 1, 2026 — AI Lead Qualification and Relationship Intelligence
- AI assistance inspected Contact/Interaction contracts, Zod, browser-local relationship flow, fixtures and product decisions, then implemented one scoped interpretation feature, authored fixture outputs, error/schema tests and documentation.
- Implementation uses a server-only Responses API call with strict JSON Schema derived from Zod, followed by Zod validation. Provider format was checked against [official OpenAI structured-output documentation](https://developers.openai.com/api/docs/guides/structured-outputs). No provider SDK or new dependency was added. Configure both OPENAI_API_KEY and OPENAI_MODEL in .env.local to enable live analysis; use a Responses model supporting strict structured output. Without a key, use the labeled demo.
- Corrected/rejected implementation approaches: no contact AI matching, no meeting-count warmth heuristic, no company-name inference, no high-priority mock selected solely by name/ID, no silent mock fallback on live failure, no persisted AI score, and no automatic calls on navigation. Existing fixtures already met the Sarah demo requirement, so no seed changes were needed. The next action checks whether the historical demo happened rather than treating a past request as a current commitment.
- Limitations: live credentials were not used; mocked transport tests verify the integration contract and failure handling, not real provider behavior or semantic accuracy. Prompt instructions reduce hallucination/injection risk but cannot guarantee truth. Auth, production rate limits, multi-user persistence and persisted analysis are deferred. Custom histories are deliberately unevaluated in demo mode. No human review or approval is claimed.
- Completed verification: TypeScript (`npx tsc --noEmit`), ESLint, production build, all 23 Node tests (matching/capture, planning and seven qualification tests), and the existing conference-scoring script passed. Production HTTP checks returned 200 for /, /dashboard, /conferences, /planning, /leads, /relationships and /settings. Analysis POST returned labeled insufficient-evidence demo output for the Harbor contact and 400 for invalid input. Browser interaction/visual QA and a credentialed provider call were not performed.

Maintain this file during every implementation phase. Record actual assistance, corrected/rejected suggestions, and decisions made by the developer; do not claim manual review that has not occurred.

## October 1, 2026 — Foundation
### Where AI helped development
- Converted the approved requirements into a minimal folder structure, TypeScript/Zod contracts, and three-table SQL migration.
- Drafted the navigation shell and explicitly labeled placeholder screens.
- Generated fictional conference/contact/interaction fixtures and a matching SQL seed.
- Drafted setup documentation and performed command-driven lint/build/startup checks.

### Suggestions rejected or corrected
The human developer corrected the initial AI-generated architecture:
- Removed separate planning, qualification, and export entities from the foundation; attendance status is on conferences.
- Made HubSpot preview core and live export stretch-only.
- Prioritized a reliable end-to-end product over test infrastructure.
- Expanded trip opportunities from exact city to same city or predefined nearby region.
- Required a clear boundary between deterministic identity logic and AI interpretation.
- Limited this phase to foundation work and required stopping before features.

The implementation also deferred shadcn scaffolding, runtime database access, matching, AI, and HubSpot until they serve approved feature work.

### Important developer decisions
The human developer approved the stack subject to minimal scope and the corrections above. The human developer required product-decisions.md, this ongoing AI log, startup verification, and a report before further approval.
Implementation choices proposed by the AI assistant: three tables, schemas as the type source, RLS with no public access, derived score contracts, reserved .example emails, system fonts, and no test framework. These remain reviewable choices rather than claims of human authorship.

### Verification limitations
No remote Supabase migration or live integration verification is claimed. The foundation contains no runtime AI feature. Command results are summarized in the completion report.


### Completed verification
- npm run build: passed, including Next.js TypeScript compilation and all routes.
- npm run lint and npm run lint -- src: passed.
- npx tsc --noEmit: passed.
- All 12 conference, 4 contact, and 6 interaction fixtures passed Zod validation; interaction references passed integrity checks.
- npm run dev -- --hostname 127.0.0.1: ready; root and all six destinations returned HTTP 200 with the navigation shell.
- Dependency installation required network approval. npm reported zero vulnerabilities and an upstream ESLint 9 deprecation warning.
- An initial ad hoc fixture-check script used an undefined module filename and failed; corrected verification passed. This was a check-script issue, not an application failure.
- Next.js generated AGENTS.md/CLAUDE.md during scaffold/startup; local layout, CSS, and client-component documentation was reviewed.
- Supabase SQL is supplied but has not been applied to a database. No browser visual QA or live API verification is claimed.

## October 1, 2026 — Parallel feature integration review
Three parallel AI agents implemented isolated conference/scoring, planning, and dashboard/shared-UI work. The Lead Agent inspected the combined changes and performed integration review without implementing later product features.
Corrected planning's hardcoded demo tier map to consume the deterministic scoring function, connected dashboard conference facts to that same scoring, reused the shared tier badge, and corrected stale pending-feature copy. The human developer required integration-only fixes and a stop before Capture, Matching, AI, Relationships, or HubSpot.
Added a focused regression for a newly planned conference and a score downgrade; retained existing lightweight scoring/planning checks. Page-local planning state and fixed-date dashboard demo data are documented limitations, rather than silently adding persistence or a new state architecture.
Verification: TypeScript and production build passed; conference scoring verification passed; all six planning tests passed, including the integration regression. Browser review confirmed dashboard metrics, conference tier filtering/reset and score explanations, plus planning add/remove recalculation (one trip to two and back to one). All three pages returned HTTP 200. The existing development server was reused; no later features were implemented.

## October 1, 2026 — Quick Capture, identity review and Relationships
AI assisted implementation of the responsive capture form, deterministic contact matcher, browser-local demo persistence boundary, candidate review with explanations/prior conferences, and searchable chronological factual timeline. Conference cards now open capture with context. Added six focused capture/matching/persistence tests using the existing compiler and node:test infrastructure.
Corrected/rejected implementation suggestions: rejected silent email auto-linking in favor of explicit confirmation for every candidate; rejected cloning an existing email for Different person because it conflicts with the SQL unique index; rejected automatic profile overwrites when linking a meeting; kept existing fixtures/SQL unchanged and used their ambiguity for the walkthrough. Preserved entered values on Back to edit. Corrected a file-write encoding failure affecting the conference component and restored its filtering/scoring interface and explanations before verifying it. Corrected ESLint's effect-state warning with deferred, cancellable browser-storage initialization.
No runtime AI, enrichment, HubSpot, authentication, planning changes, scoring changes or remote database calls were added. Browser persistence is an explicit demo assumption with multi-tab/device and profile-update limitations documented in product-decisions.md.
Verification: 12 capture/planning tests passed; TypeScript, ESLint and production build passed. Browser walkthrough confirmed multiple candidate reasons/prior conferences, editing with preserved fields, Same person save, and four-meeting Sarah timeline after reload. Existing development server was reused. Additional route and final checks are recorded in the completion report; no remote database testing is claimed.
Final checks: all five requested routes returned HTTP 200; conference-scoring regression checks passed. Browser relationship search returned the two Northstar contacts, conference Tier A filter returned 8/12 events, and its Quick Capture link preselected the conference. Final production build passed after the lint correction. Physical-phone testing and multi-tab write concurrency remain unverified.

## October 1, 2026 — Relationship Agent integration review
The Relationship Agent implemented isolated Quick Capture, deterministic matching, and factual cross-conference history. The Lead Agent inspected the combined code and corrected timestamp ordering, capture-to-relationships styling coupling, URL-context resets, duplicate stored-email validation, and capture-another storage error handling.
Added focused regression checks for repeated meetings across conferences, Different Person preserving candidates, conflicting emails, timestamp offsets, and duplicate saved emails. Matching/capture tests (10), planning tests (6), existing scoring verification, TypeScript, ESLint, and production build passed. All five requested routes returned HTTP 200.
Browser verification covered Conference → preselected Capture → explained candidates → Same Person → saved interaction → cross-conference timeline. Different Person created a fifth contact with one meeting while existing candidates remained; Same Person kept the contact count at four. Mobile capture was checked at 390px without horizontal overflow. Two clearly labeled integration-review demo meetings were intentionally saved in this browser during verification. No AI qualification, relationship summarization, or HubSpot integration was implemented.

## October 1, 2026 — AI Agent integration review
The AI Agent implemented isolated semantic qualification and relationship intelligence. The Lead Agent reviewed schemas, prompt/data separation, server-only request boundaries, browser bundles, demo replay, error handling, and the existing product flow using official OpenAI structured-output documentation.
Corrected a real same-origin 403 caused by internal/browser hostname differences; added route regression coverage for same-host, foreign, malformed-origin and malformed-JSON requests. Improved client invalid-JSON/error handling, prioritization-score labeling, and stale capture copy. No identity/scoring/planning AI, new architecture, or HubSpot work was introduced.
All 24 tests passed (10 capture/matching, 6 planning, 8 qualification/route), plus scoring verification, TypeScript, ESLint and production build. The first build hit a Windows EPERM while the dev server was running; stopping it and rebuilding succeeded. The production server was started for final review.
Browser checks covered planning add, conference-context capture, explicit Same Person, saved chronological timeline, Analyze Relationship, labeled custom-history insufficient-evidence output, suggested next action, and Analyze Again. One labeled AI-integration demo meeting was saved; existing contacts remained separate. API failure paths were tested with mocked provider responses rather than deliberately forcing every error in the browser. No real provider call was made, so semantic grounding and prompt-injection resistance of a live model are not claimed as proven.

## October 1, 2026 — HubSpot export integration
AI assisted the isolated contact export flow: explicit preview/confirmation, deterministic standard-property mapping, retained AI context, server-only optional live export, email lookup/update/create, and clearly labeled simulation. Existing contact/entity/storage contracts and AI interpretation, matching, scoring and planning were preserved. Official HubSpot contact API documentation and bundled Next.js route/boundary guides were consulted.
Rejected blind create-on-retry and AI fields in standard properties. Added direct email lookup after empty search to account for indexing lag; missing optional values do not clear CRM fields. Credentials stay server-side; upstream error bodies are suppressed. No real account request was made. Process-local retry protection and transient UI status remain explicit MVP limitations.
Verification: all 33 tests passed, including nine focused HubSpot tests for mapping, preview/simulation, missing email/token, create/update, indexing lag, repeated submission, provider failures, timeout and same-origin request handling. TypeScript, ESLint, production build and existing scoring checks passed. Browser walkthrough on the new production build confirmed factual Relationships, seeded demo AI context in preview, simulation completion with no real contact ID, and missing-email explanation. Browser bundle scan found no HubSpot token variable, provider URL or Bearer header. A final malformed-lookup validation regression is included; final checks are recorded in the completion report.

## October 1, 2026 — Final integration review
Parallel AI agents implemented isolated feature work; the Lead Agent reviewed the combined MVP without adding features. Corrected duplicated HubSpot profile validation, strengthened response/action consistency to prevent misleading export success, and corrected stale product/README copy. Rejected broad refactoring and inventing demo intelligence for new notes; custom histories retain an honest insufficient-evidence fallback.
All 34 tests passed (10 capture/matching, 6 planning, 8 qualification/route, 10 HubSpot), plus scoring checks, TypeScript, ESLint and production build. A Windows/OneDrive cache-removal error was resolved by stopping the server and clearing only generated .next files. All six routes returned HTTP 200. Browser verification covered the complete simulated export flow and Different Person, plus 390px capture without overflow. Two labeled final-review meetings were saved in browser-local demo storage. No live OpenAI or HubSpot calls were made. Runtime persistence/authentication and live-account verification remain submission limitations.

## October 1, 2026 — Final skeptical salesperson QA
Reviewed the complete browser journey and all existing checks without adding features. Fixed long valid identity overflow in mobile Relationships, capture matching and HubSpot preview through wrapping/shrinkable columns; clarified that Planning resets on page navigation. All 34 tests, scoring checks, TypeScript, ESLint and final production build passed. Browser evidence confirmed Same Person preserves four contacts while adding a fourth Sarah meeting, Different Person creates a separate identity, seeded factual demo intelligence, honest custom-history fallback, and explicit simulated exports including no-email preview. No captured console warnings/errors. Tested 390 × 844 and 1280 × 900. Report and screenshot are in docs/final-qa-report.md and docs/qa/mobile-matching.jpg. Live provider behavior, physical phones and multi-tab writes remain unverified; unprotected live endpoints and uncommitted submission packaging are reported. Temporary QA servers were stopped.
