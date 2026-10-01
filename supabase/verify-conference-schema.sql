-- Read-only inspection. Compare columns/constraints to all three migration files.
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name in ('conferences','contacts','interactions','conference_observations','conference_research_runs')
order by table_name, ordinal_position;
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('conferences','contacts','interactions','conference_observations','conference_research_runs');
select conrelid::regclass as table_name, conname, convalidated, pg_get_constraintdef(oid) as definition
from pg_constraint where connamespace = 'public'::regnamespace order by conrelid, conname;
select tablename, indexname, indexdef from pg_indexes where schemaname = 'public';
select table_name, grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon','authenticated','service_role')
order by table_name, grantee, privilege_type;
select id, name, is_demo, lifecycle_status, needs_review, last_verified_at, target_audience_fit,
  target_audience_assessment->'result'->>'supportedScoreFloor' as supported_floor
from public.conferences where not is_demo order by id;
