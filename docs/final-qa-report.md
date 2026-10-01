# Final QA report — 1 October 2026

Verdict: the credential-free MVP builds and its core capture/matching/timeline/simulated-export journey works. No reproducible P0 application defect was found. Two safe P1 issues were fixed. The requested journey has a material demo limitation: new meetings are not interpreted by fixture-only AI. Public deployment with live credentials needs access protection. A Git-based submission must include the currently untracked MVP files; HEAD is still the starter commit.

## 1. P0 issues found and fixed

None. No reproduced crash, build failure, destructive save, or leaked credential in the inspected source/history. This is scoped QA, not a comprehensive security audit.

## 2. P1 issues found and fixed

- **Long valid identities broke responsive Relationships and export preview.** At 390 × 844, a contact with a 160-character unbroken name/company expanded the document to 3,045px; the initial fix still allowed the preview to expand to 1,800px. Added wrapping to capture/relationship content and explicit shrinkable grid columns, including export property rows. Final matching, timeline and preview document widths were 375px at a 390px viewport; desktop was 1,265px at a 1,280px viewport. No truncation or identity/scoring changes.
- **Planning overstated the lifetime of edits.** “Changes stay in this session and reset on reload” implied that page navigation was safe. State is page-local. Copy now explicitly says changes reset when leaving the page or reloading. Persistence was not added.

Changed files: `src/components/capture/capture-workspace.tsx`, `relationships-workspace.tsx`, `hubspot-export.tsx`, and `src/components/planning/planning-workspace.tsx`.

## 3. Remaining P1 issues

- **Demo AI cannot complete the requested updated-history intelligence demonstration.** Fresh seeded Sarah returns High / 92 / Warming, with factual dated reasons, progression and next action. After Same Person appends a meeting, exact fixture replay no longer applies: result is Low / 0 / Insufficient evidence with an explicit explanation that custom notes are not interpreted. Honest fallback, but a salesperson may read 0 as a downgrade. Demonstrate seeded intelligence before capture, and disclose this limitation; interpreting custom notes requires configured live AI. No invented demo result was added.
- **Live integrations lack access protection.** API origin checks are not authentication; direct callers can supply a matching Origin. Enabling live OpenAI/HubSpot tokens on a publicly accessible deployment permits untrusted callers to consume AI budget or mutate CRM contacts. The AI route also accepts requests without Origin. Leave credentials absent for the public demo. Authentication/rate limiting is outside these safe QA fixes.
- **Operational submission packaging remains outstanding.** Git status shows most MVP code, tests, SQL, and docs as untracked, while HEAD is the original starter commit. A deployment or reviewer using only that commit will not receive the reviewed application. No commit, push, or deployment was performed.

## 4. P2 issues worth knowing about

- Settings still displays “Foundation ready”, “A place for the next step”, and implementation-approval placeholder text. It feels unfinished; the page does explain that credentials are configured server-side.
- Mobile navigation occupies substantial vertical space before capture. Matching three candidates requires considerable scrolling. Controls are usable, but conference-floor speed could improve in future work.
- Matching explanations expose “normalized” terminology; scoring explains internal region identifiers. Understandable, but more technical than typical sales copy.
- Capture and Relationships use smaller section headings than Dashboard/Conferences/Planning. Tier badges remain consistent.
- Unused starter SVG assets remain in `public/`; no consequential dead-code defect was identified.

## 5. Tests/checks and results

All final checks passed after the fixes:

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Pass |
| `npm run lint` | Pass |
| `npm run build` | Pass; all application/API routes generated |
| `node --test tests/*.test.mjs` | 34/34 pass: capture/matching 10, planning 6, qualification 8, HubSpot 10 |
| `node scripts/check-conference-scoring.cjs` | Pass: 12 fixtures, weights, bands, tier boundaries, determinism, rounding |
| Browser console | No captured warnings/errors during reviewed flows |

Automated coverage includes whitespace/case matching, Jon/Jonathan aliases, same-name/different-company candidates, same-email/name conflicts, multiple candidates, duplicate-email rejection, idempotent saves, failed/corrupt storage, chronological instant sorting, quarter/year/DST boundaries, invalid/refused/incomplete AI output, provider timeouts, missing credentials/email, simulated export labels, live create/update with mocked provider responses, repeated exports, and origin/request validation.

Browser QA used the existing localhost:3000 app, a fresh production build on :3100, and a temporary dev server on :3101 for final CSS verification. Temporary servers were stopped. The final production build passed; final CSS was verified interactively in dev, rather than re-running the entire journey on the last production build.

## 6. Complete demo-flow result

1. Dashboard opened with clear fictional-data and fixed October 1 snapshot labels.
2. Conferences displayed 12 ranked fixtures. Expanded Payments & Treasury Summit's 99/100 explanation: 40 + 28.8 + 15 + 15 = 98.8, rounded to 99 / Tier A. Contributions and assumptions were understandable.
3. Planning reviewed existing quarters/trip insight. Added Commerce Finance Sessions: planned count 5 → 6, Q4 1 → 2, coverage gaps 7 → 6.
4. Quick Capture rejected empty required selection through browser validation. Case/whitespace Sarah at Northstar yielded three explained candidates, including Sara and the Harbor namesake.
5. Same Person kept four contacts and increased Sarah's timeline from three to four meetings; original notes remained unchanged and the new conference-specific QA note appeared last.
6. Different Person, same name at another company without email, created a fifth contact with its own one-meeting timeline and notes.
7. Updated-history AI returned explicitly labeled insufficient-evidence fallback. Fresh seeded Sarah separately returned High / 92 / Warming with reasons supported by dated notes and no claimed purchase commitment. Live semantic grounding was not verified.
8. HubSpot preview showed name split, email, company and title, with intelligence/notes retained locally. Confirmation displayed “Demo mode · Simulated HubSpot export · No contact sent to HubSpot”. No real CRM ID appeared. No-email preview omitted email and simulation succeeded with explicit live-export restriction.

Result: functional demo journey passes, with the updated-history AI interpretation gap described above. No live provider request was made.

## 7. Mobile Quick Capture result

Tested at 390 × 844. Main form controls and action buttons have 48px minimum heights; optional email/role and short required-field set suit quick entry. Match decisions use inline cards, avoiding a cramped modal. Save feedback links directly to the contact timeline. Back to edit preserves entered values. Scrolling works. Long identity overflow was fixed and verified in matching, Relationships and export preview, plus a desktop 1,280 × 900 check.

Usable for a demo and a short conference capture; navigation and multiple-candidate scrolling add friction. Physical-phone keyboard, touch accuracy and offline behavior were not tested.

Evidence: [mobile matching screenshot](qa/mobile-matching.jpg).

## 8. Security/configuration observations

- No concrete secret found in inspected application/configuration files or the single committed starter history. `.env*` is ignored except the blank `.env.example`; private tokens are not `NEXT_PUBLIC_` values.
- Provider clients import `server-only`; environment access occurs in server routes. Client components use relative same-origin API paths. Provider URLs are server-side; no functional hardcoded-localhost dependency was found in the app.
- Requests and outputs are schema-validated; upstream credential/error bodies are not forwarded. Prompt instructs the model to treat notes as untrusted data and use only supplied facts. Structural validation cannot prove a live model's claims are supported.
- Captures are plaintext browser-local demo records. Use synthetic data. Supabase is not connected; migration access controls are not runtime application access protection.
- Real-account export, production proxy behavior and a deployed host were not tested.

## 9. Remaining known limitations

Dashboard remains a labeled fixed fixture snapshot. Planning is page-local. Contacts/interactions persist only in the browser; multi-tab simultaneous writes have no locking and can overwrite each other. No authentication, database persistence, contact-edit UI, offline guarantee or distributed export idempotency. HubSpot retry protection is process-local for one minute; export/analysis UI results reset with page state. Exact name/known-alias matching is deliberately limited, not general fuzzy matching. Missing/corrupt storage and upstream failure paths were tested through existing unit tests, not injected into the browser UI. New QA records remain in local demo storage at the tested origins; no existing records were deleted.

## 10. Deployment/submission blockers

No application build blocker remains for a credential-free synthetic-data demo. Before a Git-based submission/deployment, include the untracked MVP files and current changes. Live credentials on an unprotected public host are blocked by the access-protection concern. If the assignment requires meaningful AI interpretation after new captures without a provider key, the demo fallback does not meet that expectation. No new features or architecture changes were made to close those scope limitations.
