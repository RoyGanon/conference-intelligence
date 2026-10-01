-- Fictional demonstration data only. Mirrors src/lib/demo-fixtures.ts.
begin;
insert into public.conferences (id, name, start_date, end_date, city, country, region, vertical, estimated_audience_size, target_audience_fit, attendance_status, is_demo) values
('10000000-0000-4000-8000-000000000001', 'Cross-Border Finance Forum', '2026-02-12', '2026-02-13', 'London', 'UK', 'uk-southeast', 'fintech', 1800, 92, 'planned', true),
('10000000-0000-4000-8000-000000000002', 'Merchant Growth Exchange', '2026-02-17', '2026-02-18', 'Reading', 'UK', 'uk-southeast', 'ecommerce', 650, 86, 'planned', true),
('10000000-0000-4000-8000-000000000003', 'Treasury Leaders Assembly', '2026-05-19', '2026-05-20', 'Amsterdam', 'Netherlands', 'benelux', 'fintech', 2400, 95, 'planned', true),
('10000000-0000-4000-8000-000000000004', 'Digital Commerce Roundtable', '2026-05-23', '2026-05-23', 'Rotterdam', 'Netherlands', 'benelux', 'ecommerce', 450, 80, 'unplanned', true),
('10000000-0000-4000-8000-000000000005', 'Global Travel Operators Forum', '2026-08-11', '2026-08-12', 'New York', 'USA', 'us-northeast', 'travel', 1200, 78, 'unplanned', true),
('10000000-0000-4000-8000-000000000006', 'Payments & Treasury Summit', '2026-09-15', '2026-09-17', 'London', 'UK', 'uk-southeast', 'fintech', 3200, 96, 'planned', true),
('10000000-0000-4000-8000-000000000007', 'SaaS Revenue Collective', '2026-10-20', '2026-10-21', 'San Francisco', 'USA', 'us-west', 'saas', 1500, 65, 'unplanned', true),
('10000000-0000-4000-8000-000000000008', 'Commerce Finance Sessions', '2026-10-24', '2026-10-24', 'San Jose', 'USA', 'us-west', 'ecommerce', 500, 88, 'unplanned', true),
('10000000-0000-4000-8000-000000000009', 'Fintech Operations Exchange', '2026-11-10', '2026-11-11', 'Tel Aviv', 'Israel', 'israel-central', 'fintech', 900, 90, 'planned', true),
('10000000-0000-4000-8000-000000000010', 'Travel Payments Workshop', '2026-11-14', '2026-11-14', 'Herzliya', 'Israel', 'israel-central', 'travel', 250, 82, 'unplanned', true),
('10000000-0000-4000-8000-000000000011', 'International Merchant Forum', '2027-02-09', '2027-02-10', 'Brussels', 'Belgium', 'benelux', 'ecommerce', 1100, 85, 'unplanned', true),
('10000000-0000-4000-8000-000000000012', 'B2B Finance Leadership Day', '2027-03-16', '2027-03-16', 'Newark', 'USA', 'us-northeast', 'saas', 350, 70, 'unplanned', true)
on conflict (id) do nothing;

insert into public.contacts (id, name, email, company, role, created_at, updated_at) values
('20000000-0000-4000-8000-000000000001', 'Sarah Cohen', 'sarah.cohen@northstar-demo.example', 'Northstar Commerce', 'VP Finance', '2026-02-12T10:00:00Z', '2026-09-16T14:30:00Z'),
('20000000-0000-4000-8000-000000000002', 'Daniel Reed', 'daniel.reed@atlas-demo.example', 'Atlas Travel Group', 'Treasury Manager', '2026-08-11T15:00:00Z', '2026-08-11T15:00:00Z'),
('20000000-0000-4000-8000-000000000003', 'Sara Cohen', null, 'Northstar Commerce', 'Finance Operations Lead', '2026-05-19T11:00:00Z', '2026-05-19T11:00:00Z'),
('20000000-0000-4000-8000-000000000004', 'Sarah Cohen', 'sarah@harbor-demo.example', 'Harbor Software', 'Product Manager', '2026-09-15T09:00:00Z', '2026-09-15T09:00:00Z')
on conflict (id) do nothing;

insert into public.interactions (id, contact_id, conference_id, occurred_at, notes, created_at) values
('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '2026-02-12T10:00:00Z', 'Quick introduction. Northstar sells in the UK and Europe. Sarah asked what Grain does.', '2026-02-12T10:00:00Z'),
('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', '2026-05-20T13:00:00Z', 'Discussed EUR and USD supplier payments and unpredictable FX costs. Sarah owns the finance budget; wants to compare options.', '2026-05-20T13:00:00Z'),
('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006', '2026-09-16T14:30:00Z', 'Interested in a product demo with the treasury team next week. Asked about implementation time and pricing. No purchase commitment yet.', '2026-09-16T14:30:00Z'),
('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000005', '2026-08-11T15:00:00Z', 'International bookings and supplier payments in several currencies. Daniel gathers requirements; CFO approves. No budget or timeline confirmed.', '2026-08-11T15:00:00Z'),
('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '2026-05-19T11:00:00Z', 'Sara works in finance operations at Northstar. Asked for a one-page overview; no specific pain shared.', '2026-05-19T11:00:00Z'),
('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000006', '2026-09-15T09:00:00Z', 'Sarah works on product at Harbor Software. General networking conversation; no finance responsibilities identified.', '2026-09-15T09:00:00Z')
on conflict (id) do nothing;
commit;

