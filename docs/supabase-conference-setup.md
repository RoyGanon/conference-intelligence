# Supabase conference preparation

The Conferences page now reads accepted real conferences on the server at request time. All other pages retain their existing demo data. The reader is read-only and never substitutes synthetic fixtures. It returns explicit unavailable states, accepted verification timestamps, lifecycle/review flags, evidence and validated audience assessments. A successful empty read is distinct from unavailable data. The page displays verification timestamps; no freshness threshold is silently imposed.

## Apply schema and import manually

In the intended Supabase project's SQL Editor, inspect the current schema first. For a fresh database, execute these files individually, in order:

1. `supabase/migrations/202610010001_foundation.sql`
2. `supabase/migrations/202610010002_real_conference_foundation.sql`
3. `supabase/migrations/202610010003_target_audience_assessment.sql`
4. `supabase/verified-conferences-import.sql`

Migrations are not rerunnable. If already applied, skip them after inspecting the schema; do not drop/recreate tables. There is no configured Supabase CLI project or migration history here. SQL Editor execution does not register CLI migration history. Existing demo records/IDs are preserved. The synthetic seed is optional and is not needed for the real import.

The generated import contains eight conferences and eight accepted observations, with evidence and assessment metadata. It refuses conflicting accepted conference identity/facts rather than overwriting them, and preserves planning state on re-import. Execute the complete transaction together. A conflict aborts it; investigate the existing record, rather than deleting it. No research runs are invented.

Regenerate to a **new output path** when needed:

```powershell
node scripts/prepare-real-conferences.cjs
node scripts/prepare-real-conferences.cjs --sql --output supabase/verified-conferences-import-new.sql
```

The eight editions were researched on October 1, 2026. Import preparation validates that dated snapshot; it is not a fresh web verification. Re-review source facts before using the snapshot at a later date.

## Configure and verify reads

Copy `.env.example` to `.env.local`. Set `SUPABASE_URL` to the HTTPS project root URL and **one** server key: preferred `SUPABASE_SECRET_KEY` (`sb_secret_...`) or legacy `SUPABASE_SERVICE_ROLE_KEY` (service-role JWT). A secret key takes precedence if both are present. Do not use publishable/anon keys or any `NEXT_PUBLIC_` credential. Configure the same variables as server secrets at deployment. No page or public readiness endpoint exposes this privileged reader.

```powershell
node scripts/check-supabase-conferences.cjs
```

This GET-only check loads local environment configuration, probes required columns in all five tables, validates accepted real records, recomputes audience assessments, and checks all eight expected IDs. It exits 1 when unavailable/incompatible/empty/missing records. Output contains no keys or upstream error bodies. `migrationsAppearApplied` means compatible columns only, not proven migration history, constraints or RLS. Run `supabase/verify-conference-schema.sql` in SQL Editor to inspect these separately. RLS must be enabled and anon/authenticated must have no table grants. Privileged keys bypass RLS and must stay server-only.

No migrations/imports were executed automatically. The developer reports production migrations/import and Vercel secrets are configured; local credentials remain absent, so local live reads are unverified. Only Conferences is integrated; scheduled research and all other runtime database integrations remain deferred.
