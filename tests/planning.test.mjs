import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const loadExternal = createRequire(import.meta.url);

// Run the pure TypeScript module with the existing compiler, no new test dependency.
function loadTypeScript(file) {
  const filename = path.resolve(testDirectory, "..", file);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", source)(specifier => {
    if (specifier.startsWith(".")) {
      return loadTypeScript(path.relative(path.resolve(testDirectory, ".."), path.resolve(path.dirname(filename), `${specifier}.ts`)));
    }
    return loadExternal(specifier);
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const { buildYearlyPlan, setConferencePlanned } = loadTypeScript("src/lib/planning.ts");
const { demoConferences } = loadTypeScript("src/lib/demo-fixtures.ts");
const { defaultStrategicVerticals } = loadTypeScript("src/lib/planning-demo.ts");
const base = demoConferences[0];
const event = (id, overrides = {}) => ({ ...base, id, ...overrides });
const config = (strategicVerticals = ["fintech"]) => ({
  year: 2026, strategicVerticals,
});

test("demo plan uses fixtures and explains the Southeast England opportunity", () => {
  const result = buildYearlyPlan(demoConferences, { year: 2026,
    strategicVerticals: defaultStrategicVerticals });
  assert.equal(result.planned.length, 5);
  assert.equal(result.trips.length, 1);
  assert.equal(result.trips[0].daysApart, 5);
  assert.equal(result.trips[0].locationReason, "Same region: Southeast England");
  assert.match(result.trips[0].reason, /Both conferences are planned and Tier A/);
  assert.equal(result.gaps.length, 7);
});

test("inclusive 7-day window, same day, and DST use date-only UTC arithmetic", () => {
  for (const [date, expected] of [["2026-03-22", 1], ["2026-03-29", 1], ["2026-03-30", 0]]) {
    const result = buildYearlyPlan([event("a", { startDate: "2026-03-22" }), event("b", { startDate: date })], config());
    assert.equal(result.trips.length, expected);
  }
});

test("both events must be planned Tier A with matching city or region", () => {
  const first = event("a");
  const second = event("b", { startDate: "2026-02-17", city: "Amsterdam", country: "Netherlands", region: "benelux" });
  assert.equal(buildYearlyPlan([first, second], config()).trips.length, 0);
  assert.equal(buildYearlyPlan([first, event("b", { attendanceStatus: "unplanned" })], config()).trips.length, 0);
  assert.equal(buildYearlyPlan([first, event("b", { vertical: "saas", targetAudienceFit: 0, estimatedAudienceSize: 0 })], config()).trips.length, 0);
  assert.equal(buildYearlyPlan([first, event("b")], config()).trips.length, 1);
  const sameCity = buildYearlyPlan([first, event("b", { city: " london ", region: "benelux" })], config());
  assert.equal(sameCity.trips[0].locationReason, "Same city: London");
  assert.equal(buildYearlyPlan([first, event("b", { country: "Canada", region: "benelux" })], config()).trips.length, 0);
});

test("quarter and year boundaries, unique deterministic pairs, and input immutability", () => {
  const input = [event("b", { startDate: "2026-04-01" }), event("a", { startDate: "2026-03-31" }),
    event("c", { startDate: "2027-01-01" })];
  const before = JSON.stringify(input);
  const result = buildYearlyPlan(input, config());
  assert.deepEqual(result.byQuarter[1].map(c => c.id), ["a"]);
  assert.deepEqual(result.byQuarter[2].map(c => c.id), ["b"]);
  assert.equal(result.planned.length, 2);
  assert.equal(result.trips.length, 1);
  assert.deepEqual(result, buildYearlyPlan([...input].reverse(), config()));
  assert.equal(JSON.stringify(input), before);
});

test("coverage tracks configured verticals and recalculates after add/remove", () => {
  const initial = [event("a", { attendanceStatus: "unplanned" })];
  const options = config(["fintech", "fintech", "travel"]);
  assert.equal(buildYearlyPlan(initial, options).gaps.length, 8);
  const added = setConferencePlanned(initial, "a", true);
  assert.equal(initial[0].attendanceStatus, "unplanned");
  const gaps = buildYearlyPlan(added, options).gaps;
  assert.equal(gaps.length, 7);
  assert.ok(!gaps.some(gap => gap.quarter === 1 && gap.vertical === "fintech"));
  assert.match(gaps[0].reason, /configured strategic vertical.*Q1 2026/);
  assert.equal(buildYearlyPlan(setConferencePlanned(added, "a", false), options).gaps.length, 8);
  assert.equal(buildYearlyPlan(initial, config([])).gaps.length, 0);
});


test("newly planned fixture uses the actual ICP tier without a demo tier assignment", () => {
  const added = setConferencePlanned(demoConferences, demoConferences[3].id, true);
  const result = buildYearlyPlan(added, config());
  assert.equal(result.trips.length, 2);
  assert.ok(result.trips.some(trip => trip.conferences.some(c => c.id === demoConferences[3].id)));
  const downgraded = added.map(c => c.id === demoConferences[3].id ? { ...c, targetAudienceFit: 79 } : c);
  assert.equal(buildYearlyPlan(downgraded, config()).trips.length, 1);
});
