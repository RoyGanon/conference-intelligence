import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const external = createRequire(import.meta.url);
const { renderToStaticMarkup } = external("react-dom/server");
function load(filename, overrides = {}) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  new Function("require", "module", "exports", code)(name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name.startsWith(".") || name.startsWith("@/")) {
      const base = name.startsWith("@/") ? path.resolve("src", name.slice(2)) : path.resolve(path.dirname(filename), name);
      const candidate = [base + ".ts", base + ".tsx", path.join(base, "index.tsx")].find(fs.existsSync);
      return load(candidate, overrides);
    }
    return external(name);
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const { prepareConferenceDiscovery, filterDiscoveryConferences } = load(path.resolve("src/lib/conference-discovery-data.ts"));
const { assessTargetAudience } = load(path.resolve("src/lib/target-audience-fit.ts"));
const dataset = JSON.parse(fs.readFileSync("supabase/data/verified-conferences-2026-10-01.json", "utf8"));
function accepted(record) {
  const result = assessTargetAudience(record.targetAudienceAssessment, record.conference.acceptedEvidence);
  return { conference: record.conference, assessment: { input: record.targetAudienceAssessment, ...result },
    supportedScoreFloor: result.supportedScoreFloor, rubricVersion: result.rubricVersion,
    unresolvedFactors: result.unresolvedFactors, missingInputs: ["estimatedAudienceSize", "targetAudienceFit", "region"].filter(field => record.conference[field] === null) };
}
const records = dataset.records.map(accepted);
const items = records.map(prepareConferenceDiscovery);
const defaults = { search: "", vertical: "", region: "", tier: "" };
test("only FinTech Connect has all inputs; seven conferences remain ICP incomplete", () => {
  assert.equal(items.length, 8);
  assert.equal(items[2].scoring.score, 100); assert.equal(items[2].scoring.tier, "A");
  for (const [index, item] of items.entries()) if (index !== 2) assert.equal(item.scoring, null);
  assert.deepEqual(items.map(item => item.supportedScoreFloor), [100, 100, 100, 100, 100, 90, 55, 90]);
});
test("filters handle unknown geography, incomplete ICP and case/whitespace searches", () => {
  assert.equal(filterDiscoveryConferences(items, { ...defaults, tier: "A" }).length, 1);
  assert.equal(filterDiscoveryConferences(items, { ...defaults, tier: "incomplete" }).length, 7);
  assert.equal(filterDiscoveryConferences(items, { ...defaults, region: "unknown" }).length, 3);
  assert.equal(filterDiscoveryConferences(items, { ...defaults, search: "  LAS VEGAS " }).length, 2);
  assert.equal(filterDiscoveryConferences(items, { ...defaults, vertical: "travel" }).length, 1);
  assert.equal(filterDiscoveryConferences(items, { ...defaults, region: "benelux" }).length, 2);
});
test("only complete accepted assessments use existing scorer; zero remains a known input", () => {
  const record = structuredClone(records[0]);
  record.conference.region = "benelux"; record.conference.estimatedAudienceSize = 0; record.conference.targetAudienceFit = 90;
  record.missingInputs = []; record.assessment.complete = true;
  const item = prepareConferenceDiscovery(record);
  assert.equal(item.scoring.score, 80); assert.equal(item.scoring.tier, "A");
  assert.equal(item.scoring.breakdown.find(part => part.factor === "size").rawScore, 0);
  assert.equal(item.scoring.breakdown.some(part => part.reason.includes("synthetic fixture")), false);
  record.assessment.complete = false;
  assert.equal(prepareConferenceDiscovery(record).scoring, null);
});
test("real UI renders evidence, incomplete labels and links using real conference IDs", () => {
  const { ConferenceDiscovery } = load(path.resolve("src/components/conferences/conference-discovery.tsx"));
  const html = renderToStaticMarkup(external("react").createElement(ConferenceDiscovery, { conferences: items }));
  for (const text of ["Money20/20 USA 2026", "Unknown / not reliably published", "ICP incomplete", "Supported target audience floor", "Official source", "Accepted source evidence"]) assert.ok(html.includes(text));
  for (const item of items) { assert.ok(html.includes(`/leads?conferenceId=${item.conference.id}`)); assert.ok(html.includes(`/planning?conferenceId=${item.conference.id}`)); }
  assert.equal(html.split(">Tier A</span>").length - 1, 1);
});
test("incomplete cards expose missing scoring inputs while complete cards remain unchanged", () => {
  const { ConferenceDiscovery } = load(path.resolve("src/components/conferences/conference-discovery.tsx"));
  const render = item => renderToStaticMarkup(external("react").createElement(ConferenceDiscovery, { conferences: [item] }));
  for (const [index, expected] of [[0, "attendance, geography"], [3, "attendance"], [5, "attendance, audience assessment"]]) {
    const html = render(items[index]);
    assert.ok(html.includes(`Missing: ${expected}</p>`));
    assert.ok(html.includes("Why is ICP incomplete?"));
  }
  const assessmentOnly = structuredClone(items[2]);
  assessmentOnly.scoring = null; assessmentOnly.missingInputs = [];
  assert.ok(render(assessmentOnly).includes("Missing: audience assessment approval</p>"));
  const complete = render(items[2]);
  assert.ok(complete.includes("100 / 100")); assert.ok(complete.includes(">Tier A</span>"));
  assert.equal(complete.includes("Missing:"), false);
});
test("page reads on each request and renders unavailable without demo fallback", async () => {
  let reads = 0; let connections = 0;
  const { default: Page } = load(path.resolve("src/app/conferences/page.tsx"), {
    "next/server": { connection: async () => { connections++; } },
    "@/lib/conferences-server": { readAcceptedRealConferences: async () => { reads++; return { status: "unavailable", code: "upstream" }; } },
  });
  const html = renderToStaticMarkup(await Page());
  assert.equal(reads, 1); assert.equal(connections, 1);
  assert.ok(html.includes("Real conferences unavailable")); assert.ok(html.includes("Retry loading conferences"));
  assert.equal(html.includes("Money20/20 USA"), false);
});
test("available page uses real reader records; empty success has its own state", async () => {
  for (const conferences of [records, []]) {
    const { default: Page } = load(path.resolve("src/app/conferences/page.tsx"), {
      "next/server": { connection: async () => {} },
      "@/lib/conferences-server": { readAcceptedRealConferences: async () => ({ status: "available", conferences }) },
    });
    const html = renderToStaticMarkup(await Page());
    assert.ok(html.includes(conferences.length ? "Money20/20 USA 2026" : "No accepted real conferences"));
    assert.equal(html.includes("Real conferences unavailable"), false);
  }
});


test("Planning and Quick Capture server routes reuse the accepted real source and fail explicitly", async () => {
  for (const [route, component] of [["planning", "PlanningWorkspace"], ["leads", "CaptureWorkspace"]]) {
    let supplied; let reads = 0;
    const componentPath = route === "planning" ? "@/components/planning/planning-workspace" : "@/components/capture/capture-workspace";
    const overrides = {
      "next/server": { connection: async () => {} },
      "@/lib/conferences-server": { readAcceptedRealConferences: async () => { reads++; return { status: "available", conferences: records }; } },
      [componentPath]: { [component]: props => { supplied = props; return null; } },
    };
    const { default: Page } = load(path.resolve("src/app", route, "page.tsx"), overrides);
    renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ conferenceId: items[2].conference.id }) }));
    assert.equal(reads, 1); assert.equal(supplied.conferenceId, items[2].conference.id);
    assert.deepEqual(supplied.conferences.map(item => (item.conference ?? item).id), items.map(item => item.conference.id));
    overrides["@/lib/conferences-server"] = { readAcceptedRealConferences: async () => ({ status: "unavailable" }) };
    const unavailable = load(path.resolve("src/app", route, "page.tsx"), overrides).default;
    const html = renderToStaticMarkup(await unavailable({ searchParams: Promise.resolve({}) }));
    assert.ok(html.includes("Real conferences unavailable"));
  }
});

test("real conference matching preserves one contact and two factual conference histories", () => {
  let stored;
  globalThis.localStorage = { getItem: () => stored ?? null, setItem: (_key, value) => { stored = value; } };
  const store = load(path.resolve("src/lib/capture-store.ts"));
  const { matchContacts } = load(path.resolve("src/lib/contact-matching.ts"));
  const initial = store.readCaptureState();
  const conferences = items.map(item => item.conference);
  const first = { name: "Morgan Realjourney", company: "Crossborder Merchant", email: "morgan@realjourney.example", notes: "First real meeting", occurredAt: "2026-12-01T10:00:00Z", conferenceId: conferences[2].id };
  const id = store.saveCapture(first, "new", "40000003-0000-4000-8000-000000000001", conferences);
  const second = { ...first, notes: "Second meeting", occurredAt: "2027-04-21T10:00:00Z", conferenceId: conferences[3].id };
  assert.equal(matchContacts(second, store.readCaptureState().contacts)[0].contact.id, id);
  store.saveCapture(second, id, "40000003-0000-4000-8000-000000000002", conferences);
  const saved = store.readCaptureState();
  assert.equal(saved.contacts.length, initial.contacts.length + 1);
  assert.deepEqual(saved.interactions.filter(i => i.contactId === id).map(i => i.conferenceId), [conferences[2].id, conferences[3].id]);
  assert.equal(store.interactionConferenceName(saved, conferences[2].id), "FinTech Connect 2026");
  assert.equal(store.interactionConferenceName(saved, conferences[3].id), "PAY360 2027");
  assert.deepEqual(saved.interactions.slice(0, initial.interactions.length), initial.interactions);
  assert.ok(store.interactionConferenceName(saved, initial.interactions[0].conferenceId).includes("synthetic demo"));
  assert.throws(() => store.saveCapture({ ...first, conferenceId: initial.interactions[0].conferenceId }, "new", "40000003-0000-4000-8000-000000000003", conferences), /Choose a listed conference/);
});

test("real planning preserves unknown inputs, quarters, coverage and browser selections", () => {
  const { buildYearlyPlan } = load(path.resolve("src/lib/planning.ts"));
  const planned = items.map(item => ({ ...item.conference, attendanceStatus: "planned" }));
  const before = JSON.stringify(planned);
  const result = buildYearlyPlan(planned, { year: 2026, strategicVerticals: ["fintech", "travel"] }, c => items.find(item => item.conference.id === c.id).scoring?.tier ?? null);
  assert.equal(result.planned.length, 3); assert.equal(result.byQuarter[4].length, 3);
  assert.equal(result.trips.length, 0); assert.equal(result.gaps.length, 7);
  assert.equal(JSON.stringify(planned), before); assert.equal(planned[0].region, null); assert.equal(planned[0].estimatedAudienceSize, null);
  let stored;
  globalThis.localStorage = { getItem: () => stored ?? null, setItem: (_key, value) => { stored = value; } };
  const storage = load(path.resolve("src/lib/planning-storage.ts"));
  assert.deepEqual(storage.readPlannedIds(), []);
  storage.writePlannedIds([planned[2].id]); assert.deepEqual(storage.readPlannedIds(), [planned[2].id]);
  stored = "bad JSON"; assert.throws(() => storage.readPlannedIds());
});

test("active selectors and planning cards render real conferences without synthetic choices", () => {
  const conferences = items.map(item => item.conference);
  const { CaptureWorkspace } = load(path.resolve("src/components/capture/capture-workspace.tsx"));
  const capture = renderToStaticMarkup(external("react").createElement(CaptureWorkspace, { conferences, conferenceId: conferences[2].id }));
  for (const c of conferences) assert.ok(capture.includes(c.id) && capture.includes(c.name.replaceAll("&", "&amp;")));
  assert.ok(capture.includes('value="' + conferences[2].id + '" selected=""'));
  assert.equal((capture.match(/<option /g) ?? []).length, 9);
  const { PlanningWorkspace } = load(path.resolve("src/components/planning/planning-workspace.tsx"));
  for (const index of [2, 3]) {
    const html = renderToStaticMarkup(external("react").createElement(PlanningWorkspace, { conferences: items, conferenceId: conferences[index].id }));
    const year = conferences[index].startDate.slice(0, 4);
    for (const c of conferences.filter(c => c.startDate.startsWith(year))) assert.ok(html.includes(c.name.replaceAll("&", "&amp;")));
    assert.ok(html.includes("ICP incomplete")); assert.ok(html.includes("saved in this browser"));
  }
});

test("integrated real capture timeline feeds exact custom history to AI and fails explicitly without configuration", async () => {
  const savedValues = new Map();
  globalThis.localStorage = { getItem: key => savedValues.get(key) ?? null, setItem: (key, value) => savedValues.set(key, value) };
  const store = load(path.resolve("src/lib/capture-store.ts"));
  const conferences = items.map(item => item.conference);
  const first = { name: "Taylor Integrated", company: "Integrated Merchant", role: "Treasury Director", conferenceId: conferences[2].id, notes: "EUR/USD supplier payments create FX cost uncertainty.", occurredAt: "2026-12-01T10:00:00Z" };
  const id = store.saveCapture(first, "new", "40000004-0000-4000-8000-000000000001", conferences);
  store.saveCapture({ ...first, conferenceId: conferences[3].id, notes: "Requested a demo with the treasury team.", occurredAt: "2027-04-21T10:00:00Z" }, id, "40000004-0000-4000-8000-000000000002", conferences);
  const different = store.saveCapture({ ...first, conferenceId: conferences[3].id }, "new", "40000004-0000-4000-8000-000000000003", conferences);
  assert.notEqual(different, id);
  const state = store.readCaptureState();
  assert.equal(state.interactions.filter(i => i.contactId === id).length, 2);
  let analysisInput;
  const { RelationshipsWorkspace } = load(path.resolve("src/components/capture/relationships-workspace.tsx"), {
    react: { ...external("react"), useEffect: () => {}, useState: initial => [initial === undefined ? state : initial, () => {}] },
    "./relationship-intelligence": { RelationshipIntelligence: ({ input }) => { analysisInput = input; return null; } },
  });
  const html = renderToStaticMarkup(external("react").createElement(RelationshipsWorkspace, { contactId: id, conferences }));
  assert.ok(html.includes("FinTech Connect 2026")); assert.ok(html.includes("PAY360 2027"));
  assert.deepEqual(analysisInput.interactions.map(i => i.conference), ["FinTech Connect 2026", "PAY360 2027"]);
  assert.deepEqual(analysisInput.interactions.map(i => i.notes), [first.notes, "Requested a demo with the treasury team."]);
  const { analyzeRelationship } = load(path.resolve("src/lib/qualification-server.ts"), { "server-only": {} });
  await assert.rejects(analyzeRelationship(analysisInput), error => error.status === 503 && error.code === "ai_not_configured");
  const output = { priority: "high", score: 85, relationshipStatus: "warming", reasons: ["Recorded FX pain and a subsequent demo request."], progressionSummary: "FX discussion followed by demo interest.", suggestedNextAction: "Arrange the requested treasury demo.", missingEvidence: ["Budget and buying timeline"] };
  const result = await analyzeRelationship(analysisInput, { apiKey: "test-only", model: "mock-provider", fetcher: async (_url, options) => {
    assert.deepEqual(JSON.parse(JSON.parse(options.body).input[0].content), analysisInput);
    return new Response(JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(output) }] }] }));
  } });
  assert.equal(result.mode, "live"); assert.deepEqual(result.analysis, output);
  assert.deepEqual(store.readCaptureState(), state);
});

test("Relationships separates seeded identities from captured contacts and preserves Sarah demo input", () => {
  const { demoContacts, demoInteractions, demoConferences } = load(path.resolve("src/lib/demo-fixtures.ts"));
  const captured = { ...demoContacts[0], id: "40000005-0000-4000-8000-000000000001", company: "Captured Company" };
  const render = contacts => {
    let received;
    const state = { contacts, interactions: demoInteractions, conferences: [] };
    const { RelationshipsWorkspace } = load(path.resolve("src/components/capture/relationships-workspace.tsx"), {
      react: { ...external("react"), useEffect: () => {}, useState: initial => [initial === undefined ? state : initial, () => {}] },
      "./relationship-intelligence": { RelationshipIntelligence: ({ input }) => { received = input; return null; } },
    });
    const html = renderToStaticMarkup(external("react").createElement(RelationshipsWorkspace, { contactId: demoContacts[0].id, conferences: [] }));
    return { html, received };
  };
  const { html, received } = render([...demoContacts, captured]);
  const capturedSection = html.match(/<section aria-label="Captured contacts">([\s\S]*?)<\/section>/)[1];
  const demoSection = html.match(/<section aria-label="Demo contacts">([\s\S]*?)<\/section>/)[1];
  assert.ok(capturedSection.includes("Captured Company")); assert.equal(capturedSection.includes(">Demo</span>"), false);
  assert.equal(demoSection.includes("Captured Company"), false);
  assert.equal((demoSection.match(/>Demo<\/span>/g) ?? []).length, demoContacts.length);
  assert.ok(html.includes("Captured relationships are saved in this browser only."));
  assert.deepEqual(received.interactions, demoInteractions.filter(i => i.contactId === demoContacts[0].id).map(i => ({ occurredAt: i.occurredAt, conference: demoConferences.find(c => c.id === i.conferenceId).name, notes: i.notes })));
  const empty = render(demoContacts).html;
  assert.ok(empty.includes("No captured contacts yet."));
  assert.ok(empty.includes("Capture someone at a conference to start building relationship history."));
});
