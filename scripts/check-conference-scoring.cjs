// Run with node scripts/check-conference-scoring.cjs; no test framework required.
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness installs a TypeScript require hook. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  module._compile(outputText, filename);
};
const { scoreConference, scoreTier, audienceSizeFit, scoringFactors } = require("../src/lib/conference-scoring.ts");
const { demoConferences } = require("../src/lib/demo-fixtures.ts");

assert.equal(Object.values(scoringFactors).reduce((sum, factor) => sum + factor.weight, 0), 1);
for (const [input, expected] of [[0, 0], [1, 40], [249, 40], [250, 60], [499, 60], [500, 80], [999, 80], [1000, 100]]) {
  assert.equal(audienceSizeFit(input), expected);
}
for (const [input, expected] of [[0, "C"], [59, "C"], [60, "B"], [79, "B"], [80, "A"], [100, "A"]]) {
  assert.equal(scoreTier(input), expected);
}
const expectedScores = [98, 87, 96, 80, 78, 99, 60, 81, 91, 74, 87, 57];
assert.equal(demoConferences.length, expectedScores.length);
demoConferences.forEach((conference, index) => {
  const result = scoreConference(conference);
  assert.equal(result.score, expectedScores[index], conference.name);
  assert.deepEqual(result, scoreConference(conference));
  assert.equal(result.breakdown.length, 4);
  assert.equal(result.score, Math.round(result.breakdown.reduce((sum, item) => sum + item.weightedContribution, 0)));
  assert.equal(result.tier, scoreTier(result.score));
  result.breakdown.forEach(item => {
    assert.ok(item.rawScore >= 0 && item.rawScore <= 100);
    assert.equal(item.weightedContribution, Math.round(item.rawScore * item.weight * 100) / 100);
    assert.ok(item.reason.length > 0);
  });
});
// Fully relevant/irrelevant input limits and rounding into tier A.
assert.equal(scoreConference({ ...demoConferences[0], targetAudienceFit: 100 }).score, 100);
assert.equal(scoreConference({ ...demoConferences[0], targetAudienceFit: 0, estimatedAudienceSize: 0, vertical: "saas", region: "us-west" }).score, 25);
assert.equal(scoreConference({ ...demoConferences[3], targetAudienceFit: 79 }).tier, "B");
assert.equal(scoreConference(demoConferences[3]).tier, "A");
console.log("Conference scoring checks passed: 12 fixtures, band/tier boundaries, weighted contributions, deterministic results, and rounding.");
