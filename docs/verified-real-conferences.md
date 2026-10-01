# Verified real conference import — October 1, 2026

Offline research snapshot, checked at 2026-10-01T18:53:01Z. Eight upcoming editions were reviewed against official pages. Nothing has been imported into a remote database or connected to the UI. Synthetic fixtures and seed SQL remain unchanged.

The canonical JSON is `supabase/data/verified-conferences-2026-10-01.json`. Evidence entries are short researcher paraphrases, not verbatim quotations or saved HTML. Each accepted factual field has source URL/name/check timestamp. Country normalization, the existing vertical mapping, and predefined regions are explicitly editorial; no maps API or numeric audience-fit assessment was used. Treasury and payments map to the existing `fintech` category. Target-audience descriptions support relevance, not a score.

## Accepted editions

| Conference / official source | Dates | City / country | Vertical | Canonical audience size | Target-audience evidence | Incomplete inputs |
|---|---|---|---|---|---|---|
| [Money20/20 USA 2026](https://us.money2020.com/) | Oct 18–21, 2026 | Las Vegas, United States | fintech | Unknown | Banks, payments, fintech and senior business leaders | audience size, target fit, region |
| [AFP 2026](https://conference.financialprofessionals.org/) | Nov 8–11, 2026 | Las Vegas, United States | fintech (treasury/finance) | Unknown | Corporate treasury, finance, payments and FP&A practitioners | audience size, target fit, region |
| [FinTech Connect 2026](https://www.fintechconnect.com/) | Dec 1–2, 2026 | London, United Kingdom | fintech | 6,000 expected visitor target | Financial institutions/fintechs; payments and business banking tracks | target fit |
| [PAY360 2027](https://pay360event.com/) | Apr 21–22, 2027 | London, United Kingdom | fintech (payments) | Unknown | Banks, merchants, card networks, acquirers and processors | audience size, target fit |
| [Money20/20 Asia 2027](https://asia.money2020.com/attend) | Apr 27–29, 2027 | Bangkok, Thailand | fintech | Unknown scalar; 5,000+ expected claim retained | Banks, fintech ecosystem and payment companies | audience size, target fit, region |
| [Money20/20 Europe 2027](https://europe.money2020.com/) | Jun 8–10, 2027 | Amsterdam, Netherlands | fintech | Unknown | Senior banking, payments, technology and retail leaders | audience size, target fit |
| [TravelTech Show 2027](https://traveltech-show.com/) | Jun 23–24, 2027 | London, United Kingdom | travel | Unknown | Travel technology buyers from operators, agencies, airlines and hotels; payment technology sectors | audience size, target fit |
| [EuroFinance International Treasury Management 2027](https://www.eurofinance.com/international-treasury-event/) | Oct 6–8, 2027 | Amsterdam, Netherlands | fintech (treasury) | Unknown scalar; 2,700+ expected claim retained | Multinational corporate treasurers, banks and treasury solution providers | audience size, target fit |

All eight have `targetAudienceFit: null`, `icpStatus: incomplete`, and no persisted score or A/B/C tier. The current scorer/UI are untouched; this dataset must not be passed into the complete runtime fixture scorer until incomplete scoring support is implemented.

## Attendance interpretation and source quality

- FinTech Connect explicitly identifies a 6,000 visitor target for 2026. It is a forecast, not registrations or measured attendance.
- Money20/20 Asia's upcoming section advertises 5,000+ attendees. The lower-bound claim is retained without converting it into an exact scalar.
- EuroFinance's 2027 invitation advertises 2,700+; its separate 2026 results also report 2,700+. These are stored as separate current-expected and historical claims. Neither supplies an exact scalar.
- Money20/20 Europe reports 7,500+ in its 2026 results section. This is historical, not a 2027 forecast.
- AFP uses both nearly 7,000 and more than 7,000 marketing language. Attendance is conservatively null; the qualified current-edition invitation is retained for review.
- Money20/20 USA's headline 11,000+ does not clearly establish forecast versus prior attendance. It is edition-unspecified and does not populate the scalar.
- TravelTech's generic buyer/supplier counts are audience segments, not a 2027 total. Explicitly labeled 2026 footer/FAQ content is not reused for the explicit next-year 2027 announcement.
- Region is null for Las Vegas and Bangkok because neither belongs to the current five predefined regions. London and Amsterdam use existing groupings.
- Phocuswright Europe was researched but excluded: its London 2027 announcement coexists with an unqualified Barcelona location statement. [Official page](https://www.phocuswrighteurope.com/). FinovateEurope 2027 was excluded because the [organizer FAQ](https://informaconnect.com/finovateeurope/faq/) says that edition will not run. Sibos Miami 2026 was already underway on the research date, so it was excluded from upcoming editions.

## Prepare a manual import

1. Validate offline: `node scripts/prepare-real-conferences.cjs`.
2. Generate UTF-8 SQL into a new file: `node scripts/prepare-real-conferences.cjs --sql --output verified-conferences-import.sql`.
3. Review the JSON, generated SQL and source pages before applying. Upcoming is relative to the recorded research date; reverify before a later import.
4. Apply all three migrations (foundation, real-conference foundation, and target-audience assessment) to a staging Supabase database, then execute the generated SQL using an authorized SQL Editor session.

The tool has no network/database access and reads no credentials. SQL imports eight conference rows and eight initial evidence observations in one transaction. Stable UUIDs and edition keys make repeat execution insert-only; matching existing records are left untouched. Conflicting accepted identities/facts abort the transaction instead of overwriting data. Planning selections are never updated. Initial observations are marked accepted to record this reviewed research snapshot, not an automated research decision. No research-run row is fabricated.

The generated SQL has not been executed against PostgreSQL locally. Database application, transaction rollback, and repeat-import verification remain staging checks. This is not a crawler, scheduler, or runtime Supabase integration.

## Deterministic audience rubric v1

`grain-target-audience-v1` uses reviewed structured tags linked to `acceptedEvidence` keys. Audience levels are 60/45/30, payment/FX levels 25/15, and leadership/buyer levels 15/10. Each factor takes its highest supported level once. Unknown remains null; explicit non-applicability can establish zero. Accepting a lower level or zero requires resolution evidence showing that higher levels do not apply. Only a reviewed assessment with every factor resolved can populate the accepted score. No names or keywords are interpreted by code.

| Edition | Audience | Payment/FX | Leadership/buyers | Supported floor | Unresolved evidence |
|---|---:|---:|---:|---:|---|
| Money20/20 USA | 60 | 15 | 15 | 90 | Cross-border/FX/multi-currency |
| AFP | 60 | 15 | 15 | 90 | Cross-border/FX/multi-currency |
| FinTech Connect | 45 | 15 | Unknown | 60 | Direct payment/treasury/merchant-FX audience; cross-border/FX; leadership |
| PAY360 | 60 | 15 | Unknown | 75 | Cross-border/FX; leadership |
| Money20/20 Asia | 60 | 25 | Unknown | 85 | Leadership |
| Money20/20 Europe | 60 | 15 | 15 | 90 | Cross-border/FX/multi-currency |
| TravelTech Show | 30 | 15 | 10 | 55 | Direct financial audience/exposure; cross-border/FX; leadership |
| EuroFinance | 60 | 15 | 15 | 90 | Cross-border/FX/multi-currency |

All eight are incomplete: accepted targetAudienceFit stays null and no tier is assigned. Source checks were not refreshed; tags use only the previously collected audience evidence. The SQL generator derives and stores input/result explanation metadata in `target_audience_assessment`. Existing imported records with different metadata require explicit review rather than an automatic overwrite. Runtime scoring weights, tiers and fixture imports are unchanged.
