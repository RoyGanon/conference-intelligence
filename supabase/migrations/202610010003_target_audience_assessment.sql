-- Metadata only; existing demo scores and records are unchanged.
begin;
alter table public.conferences add column target_audience_assessment jsonb
  check (target_audience_assessment is null or jsonb_typeof(target_audience_assessment) = 'object');
-- Detailed tags/evidence validation is performed by the versioned Zod/scorer write boundary.
-- Existing real records without metadata remain compatible until explicitly assessed.
alter table public.conferences add constraint target_audience_acceptance check (
  target_audience_assessment is null or (
    target_audience_assessment #>> '{input,rubricVersion}' = 'grain-target-audience-v1'
    and target_audience_assessment #>> '{result,rubricVersion}' = 'grain-target-audience-v1'
    and target_audience_fit is not distinct from (target_audience_assessment #>> '{result,acceptedScore}')::integer
    and (target_audience_fit is null or (
      target_audience_assessment #>> '{input,reviewState}' = 'reviewed'
      and target_audience_assessment #>> '{result,complete}' = 'true'
    ))
  ) is true
);
commit;
