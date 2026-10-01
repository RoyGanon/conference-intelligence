/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS developer CLI. */
// Developer-only, read-only CLI. Next enforces server-only in application builds.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
require("@next/env").loadEnvConfig(process.cwd());
function load(filename) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function("require", "module", "exports", code)(name => name === "server-only" ? {} : name.startsWith(".")
    ? load(path.resolve(path.dirname(filename), `${name}.ts`)) : require(name), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const dataset = JSON.parse(fs.readFileSync(path.resolve("supabase/data/verified-conferences-2026-10-01.json"), "utf8"));
load(path.resolve("src/lib/conferences-server.ts")).checkConferencesReadiness({}, dataset.records.map(record => record.conference.id))
  .then(result => { console.log(JSON.stringify(result, null, 2)); process.exitCode = result.ready ? 0 : 1; })
  .catch(() => { console.error("Readiness check failed; no database writes performed."); process.exitCode = 1; });
