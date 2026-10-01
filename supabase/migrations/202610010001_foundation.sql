-- Single-workspace MVP. No browser access or database connection is implemented yet.
begin;
create table public.conferences (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  start_date date not null, end_date date not null check (end_date >= start_date),
  city text not null check (char_length(btrim(city)) > 0),
  country text not null check (char_length(btrim(country)) > 0),
  region text not null check (region in ('uk-southeast','benelux','us-northeast','us-west','israel-central')),
  vertical text not null check (vertical in ('fintech','ecommerce','travel','saas')),
  estimated_audience_size integer not null check (estimated_audience_size >= 0),
  target_audience_fit integer not null check (target_audience_fit between 0 and 100),
  attendance_status text not null default 'unplanned' check (attendance_status in ('unplanned','planned')),
  is_demo boolean not null default false
);
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  email text check (email is null or (char_length(email) between 3 and 254 and email = btrim(email))),
  company text check (char_length(company) <= 160),
  role text check (char_length(role) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Case-insensitive exact email uniqueness. Identity matching is deferred.
create unique index contacts_email_unique on public.contacts (lower(email)) where email is not null;
create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete restrict,
  conference_id uuid not null references public.conferences(id) on delete restrict,
  occurred_at timestamptz not null,
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now()
);
create index interactions_contact_time on public.interactions (contact_id, occurred_at);
create index interactions_conference on public.interactions (conference_id);
-- Deny anonymous/authenticated access. Future protected server routes use server-only credentials.
alter table public.conferences enable row level security;
alter table public.contacts enable row level security;
alter table public.interactions enable row level security;
revoke all on public.conferences, public.contacts, public.interactions from anon, authenticated;
grant select, insert, update, delete on public.conferences, public.contacts, public.interactions to service_role;
commit;

