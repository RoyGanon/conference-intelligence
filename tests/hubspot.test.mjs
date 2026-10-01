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
const cache = new Map();
function loadTypeScript(file) {
  if (cache.has(file)) return cache.get(file);
  const filename = path.resolve(testDirectory, "..", file);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", source)(specifier => {
    if (specifier.startsWith("@/")) return loadTypeScript("src/" + specifier.slice(2) + ".ts");
    if (specifier === "server-only") return {}; // Next enforces this boundary during build.
    if (specifier.startsWith(".")) {
      return loadTypeScript(path.relative(path.resolve(testDirectory, ".."), path.resolve(path.dirname(filename), `${specifier}.ts`)));
    }
    return loadExternal(specifier);
  }, compiledModule, compiledModule.exports);
  cache.set(file, compiledModule.exports); return compiledModule.exports;
}

const { hubspotProperties } = loadTypeScript("src/lib/hubspot.ts");
const { exportHubspot } = loadTypeScript("src/lib/hubspot-server.ts");
const contact = { name: "Sarah Cohen", email: "Sarah@Example.com", company: "TravelPay", role: "CFO" };
const input = (action = "live", changes = {}) => ({ action, contact: { ...contact, ...changes } });
const json = (value, status = 200) => Response.json(value, { status });
const unavailable = async () => { throw Error("No provider call expected"); };

test("mapping includes only standard available fields without modifying contact", () => {
  const before = JSON.stringify(contact);
  assert.deepEqual(hubspotProperties(contact), { firstname: "Sarah", lastname: "Cohen", email: "sarah@example.com", company: "TravelPay", jobtitle: "CFO" });
  assert.deepEqual(hubspotProperties({ name: "Prince", email: null, company: "", role: null }), { firstname: "Prince" });
  assert.equal(JSON.stringify(contact), before);
});
test("preview needs no email/token/network, simulation is explicit, mode changes fail closed", async () => {
  const preview = await exportHubspot(input("preview", { email: null }), { fetcher: unavailable });
  assert.equal(preview.outcome, "preview"); assert.equal(preview.mode, "simulation");
  const simulated = await exportHubspot(input("simulate"), { fetcher: unavailable });
  assert.equal(simulated.outcome, "simulated"); assert.equal(simulated.contactId, undefined);
  assert.equal((await exportHubspot(input("preview"), { token: "configured", fetcher: unavailable })).mode, "live");
  await assert.rejects(exportHubspot(input(), { fetcher: unavailable }), e => e.status === 503);
  await assert.rejects(exportHubspot(input("live", { email: null }), { token: "configured", fetcher: unavailable }), e => e.status === 400);
  await assert.rejects(exportHubspot(input("simulate"), { token: "configured", fetcher: unavailable }), e => e.status === 409);
  await assert.rejects(exportHubspot({ ...input(), notes: "not permitted" }), e => e.status === 400);
});
test("create searches normalized email, checks direct lookup, then writes the exact preview", async () => {
  const calls = [];
  const result = await exportHubspot(input(), { token: "create-test", fetcher: async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.Authorization, "Bearer create-test");
    if (url.endsWith("/search")) {
      assert.equal(JSON.parse(options.body).filterGroups[0].filters[0].value, "sarah@example.com");
      return json({ total: 0, results: [] });
    }
    if (options.method === "GET") return json({}, 404);
    assert.equal(options.method, "POST"); assert.deepEqual(JSON.parse(options.body), { properties: hubspotProperties(contact) });
    return json({ id: "123" });
  }});
  assert.equal(calls.length, 3); assert.equal(result.contactId, "123"); assert.equal(result.outcome, "created");
});
test("existing contact updates by returned ID; omitted fields are never cleared", async () => {
  const result = await exportHubspot(input("live", { company: null, role: "" }), { token: "update-test", fetcher: async (url, options) => {
    if (url.endsWith("/search")) return json({ total: 1, results: [{ id: "456" }] });
    assert.ok(url.endsWith("/456")); assert.equal(options.method, "PATCH");
    assert.equal("company" in JSON.parse(options.body).properties, false);
    assert.equal("jobtitle" in JSON.parse(options.body).properties, false);
    return json({ id: "456" });
  }});
  assert.equal(result.outcome, "updated");
});
test("recent create missed by search is found by direct email lookup", async () => {
  const result = await exportHubspot(input(), { token: "lag-test", fetcher: async (url, options) => {
    if (url.endsWith("/search")) return json({ total: 0, results: [] });
    if (options.method === "GET") { assert.match(url, /sarah%40example.com\?idProperty=email/); return json({ id: "789" }); }
    assert.equal(options.method, "PATCH"); return json({ id: "789" });
  }});
  assert.equal(result.outcome, "updated");
});
test("double submissions share one export; short-lived completed retry returns same result", async () => {
  let calls = 0;
  const options = { token: "dedup-test", fetcher: async (url) => { calls++; return url.endsWith("/search") ? json({ total: 1, results: [{ id: "10" }] }) : json({ id: "10" }); } };
  const [a, b] = await Promise.all([exportHubspot(input(), options), exportHubspot(input(), options)]);
  assert.deepEqual(a, b); assert.equal(calls, 2);
  assert.deepEqual(await exportHubspot(input(), options), a); assert.equal(calls, 2);
  await assert.rejects(exportHubspot(input("live", { role: "CEO" }), options), e => e.status === 409);
});
test("search/auth/rate-limit/create/update/conflict/invalid responses are safe errors", async () => {
  for (const stage of ["search", "create", "update"]) {
    for (const status of [401, 403, 429, 500, 409]) {
      const before = JSON.stringify(contact);
      await assert.rejects(exportHubspot(input(), { token: `failure-${stage}-${status}`, fetcher: async (url, options) => {
        if (url.endsWith("/search") && stage !== "search") return json({ total: stage === "update" ? 1 : 0, results: stage === "update" ? [{ id: "1" }] : [] });
        if (options.method === "GET") return json({}, 404);
        return new Response("SECRET provider body", { status });
      }}), e => !e.message.includes("SECRET") && e.status >= 400);
      assert.equal(JSON.stringify(contact), before);
    }
  }
  for (const value of [{ total: 2, results: [{ id: "1" }, { id: "2" }] }, { results: [] }, { total: 1, results: [] }, { total: 0, results: [{ id: "" }] }])
    await assert.rejects(exportHubspot(input(), { token: "invalid-test", fetcher: async () => json(value) }));
  await assert.rejects(exportHubspot(input(), { token: "invalid-lookup", fetcher: async url => url.endsWith("/search") ? json({ total: 0, results: [] }) : json(false) }));
});
test("timeout is reported and failed submissions can be retried", async () => {
  await assert.rejects(exportHubspot(input(), { token: "timeout-test", timeoutMs: 5, fetcher: async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Error("SECRET")))) }), e => /timed out/.test(e.message));
  const result = await exportHubspot(input(), { token: "timeout-test", fetcher: async url => url.endsWith("/search") ? json({ total: 1, results: [{ id: "retry" }] }) : json({ id: "retry" }) });
  assert.equal(result.contactId, "retry");
});
test("route rejects absent/foreign/malformed origins, bad JSON and oversized requests", async () => {
  const { POST } = loadTypeScript("src/app/api/hubspot/export/route.ts");
  const request = (origin, body = JSON.stringify(input("preview"))) => new Request("http://localhost:3000/api/hubspot/export", { method: "POST", headers: { host: "127.0.0.1:3000", ...(origin ? { origin } : {}), "Content-Type": "application/json" }, body });
  assert.equal((await POST(request("http://127.0.0.1:3000"))).status, 200);
  for (const origin of [undefined, "http://foreign.example", "null", "https://127.0.0.1:3000"]) assert.equal((await POST(request(origin))).status, 403);
  assert.equal((await POST(request("http://127.0.0.1:3000", "bad json"))).status, 400);
  assert.equal((await POST(request("http://127.0.0.1:3000", "a".repeat(4001)))).status, 413);
});

test("response validation cannot mislabel simulation as a real export", () => {
 const { hubspotResponseSchema }=loadTypeScript("src/lib/hubspot.ts");
 const properties=hubspotProperties(contact);
 for (const value of [
  {mode:"live",outcome:"simulated",properties},
  {mode:"simulation",outcome:"created",properties,contactId:"1"},
  {mode:"live",outcome:"updated",properties},
  {mode:"simulation",outcome:"simulated",properties,contactId:"1"},
 ]) assert.equal(hubspotResponseSchema.safeParse(value).success,false);
 assert.equal(hubspotResponseSchema.safeParse({mode:"simulation",outcome:"simulated",properties}).success,true);
 assert.equal(hubspotResponseSchema.safeParse({mode:"live",outcome:"updated",properties,contactId:"1"}).success,true);
});
