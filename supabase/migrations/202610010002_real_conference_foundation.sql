-- Additive only. Existing fixture IDs, values, and demo flags are preserved.
begin;
alter table public.conferences
  alter column region drop not null,
  alter column estimated_audience_size drop not null,
  alter column target_audience_fit drop not null,
  add column edition_key text check (char_length(btrim(edition_key)) between 1 and 300),
  add column lifecycle_status text not null default 'scheduled' check (lifecycle_status in ('scheduled','changed','cancelled')),
  add column needs_review boolean not null default false,
  add column review_reason text check (char_length(btrim(review_reason)) between 1 and 2000),
  add column source_url text check (source_url ~ '^https?://[^[:space:]]+$'),
  add column source_name text check (char_length(btrim(source_name)) between 1 and 160),
  add column last_checked_at timestamptz,
  add column last_verified_at timestamptz,
  add column accepted_evidence jsonb not null default '{}' check (jsonb_typeof(accepted_evidence) = 'object'),
  add column updated_at timestamptz not null default now(),
  add column revision integer not null default 1 check (revision > 0),
  add constraint conference_review_reason check (not needs_review or review_reason is not null);
-- NOT VALID preserves any legacy real rows lacking evidence; new/updated rows must comply.
alter table public.conferences add constraint real_conference_source
  check (is_demo or (edition_key is not null and source_url is not null and source_name is not null)) not valid;
create unique index conferences_real_edition_unique on public.conferences (edition_key) where not is_demo;

create table public.conference_observations (
  id uuid primary key default gen_random_uuid(),
  conference_id uuid references public.conferences(id) on delete restrict,
  edition_key text not null check (char_length(btrim(edition_key)) between 1 and 300),
  source_url text not null check (source_url ~ '^https?://[^[:space:]]+$'),
  source_name text not null check (char_length(btrim(source_name)) between 1 and 160),
  checked_at timestamptz not null default now(), verified_at timestamptz,
  fetch_status text not null check (fetch_status in ('success','failed')),
  content_hash text check (content_hash ~ '^[a-f0-9]{64}$'),
  evidence jsonb not null default '[]' check (jsonb_typeof(evidence) = 'array'),
  extracted_facts jsonb not null default '{}' check (jsonb_typeof(extracted_facts) = 'object'),
  proposed_changes jsonb not null default '{}' check (jsonb_typeof(proposed_changes) = 'object'),
  issues jsonb not null default '[]' check (jsonb_typeof(issues) = 'array'),
  review_state text not null default 'pending' check (review_state in ('pending','accepted','rejected','no_change')),
  reviewed_at timestamptz,
  check (fetch_status <> 'failed' or (verified_at is null and review_state <> 'accepted'))
);
create index observations_conference_time on public.conference_observations (conference_id, checked_at desc);
create index observations_pending on public.conference_observations (review_state, checked_at);
create index observations_edition on public.conference_observations (edition_key);

create table public.conference_research_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(), finished_at timestamptz,
  status text not null default 'running' check (status in ('running','succeeded','partial','failed')),
  counts jsonb not null default '{}' check (jsonb_typeof(counts) = 'object'),
  errors jsonb not null default '[]' check (jsonb_typeof(errors) = 'array'),
  cursor jsonb not null default '{}' check (jsonb_typeof(cursor) = 'object'),
  lease_key text check (char_length(btrim(lease_key)) between 1 and 160), lease_expires_at timestamptz,
  check ((lease_key is null) = (lease_expires_at is null)),
  check (finished_at is null or finished_at >= started_at)
);
create unique index research_run_lease_unique on public.conference_research_runs (lease_key) where lease_key is not null;
-- Future lease acquisition/release and atomic acceptance are deliberately not implemented.
alter table public.conference_observations enable row level security;
alter table public.conference_research_runs enable row level security;
revoke all on public.conference_observations, public.conference_research_runs from anon, authenticated;
grant select, insert, update, delete on public.conference_observations, public.conference_research_runs to service_role;
commit;
