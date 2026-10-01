import "server-only";
import { storedConferenceSchema } from "./conference-data";
import { assessTargetAudience, targetAudienceAssessmentSchema } from "./target-audience-fit";

const columns = {
  conferences: "id,name,start_date,end_date,city,country,region,vertical,estimated_audience_size,target_audience_fit,attendance_status,is_demo,edition_key,lifecycle_status,needs_review,review_reason,source_url,source_name,last_checked_at,last_verified_at,accepted_evidence,updated_at,revision,target_audience_assessment",
  contacts: "id,name,email,company,role,created_at,updated_at",
  interactions: "id,contact_id,conference_id,occurred_at,notes,created_at",
  conference_observations: "id,conference_id,edition_key,source_url,source_name,checked_at,verified_at,fetch_status,content_hash,evidence,extracted_facts,proposed_changes,issues,review_state,reviewed_at",
  conference_research_runs: "id,started_at,finished_at,status,counts,errors,cursor,lease_key,lease_expires_at",
} as const;
type Options = { url?: string; key?: string; fetcher?: typeof fetch; timeoutMs?: number };
class ReadError extends Error {
  constructor(readonly code: "not_configured" | "configuration" | "upstream" | "timeout" | "invalid_data") { super(code); }
}
function connection(options: Options) {
  const raw = options.url ?? process.env.SUPABASE_URL;
  const key = options.key ?? (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!raw || !key) throw new ReadError("not_configured");
  let url: URL;
  try { url = new URL(raw); } catch { throw new ReadError("configuration"); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new ReadError("configuration");
  return { url, key };
}
async function request(table: keyof typeof columns, query: Record<string, string>, options: Options): Promise<unknown[]> {
  const { url, key } = connection(options);
  const endpoint = new URL(`/rest/v1/${table}`, url);
  endpoint.search = new URLSearchParams({ select: columns[table], ...query }).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10000);
  try {
    const response = await (options.fetcher ?? fetch)(endpoint, {
      method: "GET", headers: { apikey: key, ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }) },
      cache: "no-store", redirect: "error", signal: controller.signal,
    });
    if (!response.ok) throw new ReadError("upstream");
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new ReadError("invalid_data");
    return data;
  } catch (error) {
    if (error instanceof ReadError) throw error;
    throw new ReadError(controller.signal.aborted ? "timeout" : "upstream");
  } finally { clearTimeout(timer); }
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
function decode(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReadError("invalid_data");
  const row = raw as Record<string, unknown>;
  const mapped = Object.fromEntries(columns.conferences.split(",")
    .filter(key => key !== "target_audience_assessment")
    .map(key => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), row[key]]));
  const conference = storedConferenceSchema.parse(mapped);
  if (conference.isDemo || !conference.lastVerifiedAt) throw new ReadError("invalid_data");
  const metadata = row.target_audience_assessment;
  let assessment = null;
  if (metadata !== null) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw new ReadError("invalid_data");
    const envelope = metadata as Record<string, unknown>;
    const input = targetAudienceAssessmentSchema.parse(envelope.input);
    const result = assessTargetAudience(input, conference.acceptedEvidence);
    if (canonical(result) !== canonical(envelope.result) || conference.targetAudienceFit !== result.acceptedScore) throw new ReadError("invalid_data");
    assessment = { input, ...result };
  } else if (conference.targetAudienceFit !== null) throw new ReadError("invalid_data");
  return { conference, assessment,
    supportedScoreFloor: assessment?.supportedScoreFloor ?? null,
    rubricVersion: assessment?.rubricVersion ?? null,
    unresolvedFactors: assessment?.unresolvedFactors ?? ["audience", "relevance", "leadership"].map(factor => ({ factor, reason: "No reviewed assessment available." })),
    missingInputs: (["estimatedAudienceSize", "targetAudienceFit", "region"] as const).filter(field => conference[field] === null),
  };
}
export type RealConferenceRead = Awaited<ReturnType<typeof readAcceptedRealConferences>>;
const unavailable = (error: unknown) => ({ status: "unavailable" as const,
  code: error instanceof ReadError ? error.code : "invalid_data" as const,
  message: "Real conference data is unavailable. Check server configuration, schema and accepted records." });

// Never substitutes fixtures. Verification timestamps and review flags let future callers show stale/review states.
export async function readAcceptedRealConferences(options: Options = {}) {
  try {
    const conferences: ReturnType<typeof decode>[] = [];
    for (let offset = 0; ; offset += 100) {
      const rows = await request("conferences", { is_demo: "eq.false", last_verified_at: "not.is.null", order: "id.asc", limit: "100", offset: String(offset) }, options);
      conferences.push(...rows.map(decode));
      if (rows.length < 100) break;
      if (offset >= 9900) throw new ReadError("invalid_data");
    }
    return { status: "available" as const, conferences, fetchedAt: new Date().toISOString() };
  } catch (error) { return unavailable(error); }
}

// Read-only compatibility probes, not proof of migration history/constraints/RLS.
export async function checkConferencesReadiness(options: Options = {}, expectedIds: string[] = []) {
  const tables = await Promise.all(Object.keys(columns).map(async table => {
    try { await request(table as keyof typeof columns, { limit: "0" }, options); return { table, compatible: true, code: null }; }
    catch (error) { return { table, compatible: false, code: unavailable(error).code }; }
  }));
  const data = await readAcceptedRealConferences(options);
  const found = new Set(data.status === "available" ? data.conferences.map(item => item.conference.id) : []);
  const missingIds = expectedIds.filter(id => !found.has(id));
  const schemaCompatible = tables.every(table => table.compatible);
  return { ready: schemaCompatible && data.status === "available" && found.size > 0 && missingIds.length === 0,
    schemaCompatible, migrationsAppearApplied: schemaCompatible, tables,
    readStatus: data.status, readError: data.status === "unavailable" ? data.code : null,
    realConferenceCount: found.size, missingIds,
    limitation: "Column probes do not establish migration history, constraints, indexes or RLS. Verify those separately in SQL." };
}
