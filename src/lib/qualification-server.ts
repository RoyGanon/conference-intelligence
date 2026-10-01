import "server-only";
import { z } from "zod";
import { qualificationInputSchema, qualificationSchema } from "./qualification";
import { qualificationPrompt } from "./qualification-prompt";
import { demoQualification } from "./qualification-demo";

export class QualificationError extends Error {
  constructor(message: string, public status = 502, public code?: "ai_not_configured") { super(message); }
}
const providerSchema = z.object({ status: z.literal("completed"), output: z.array(z.object({
  type: z.string(), content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
})) });
// Imported only by the server route. No secrets or provider requests in client modules.
export async function analyzeRelationship(raw: unknown, options: { apiKey?: string; model?: string; fetcher?: typeof fetch; timeoutMs?: number } = {}) {
  const parsed = qualificationInputSchema.safeParse(raw);
  if (!parsed.success) throw new QualificationError("Invalid contact or history. Maximum 100 meetings and 50,000 note characters.", 400);
  const input = { ...parsed.data, interactions: [...parsed.data.interactions].sort((a,b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt)) };
  if (!options.apiKey?.trim()) {
    const analysis = demoQualification(input);
    if (analysis) return { mode: "demo" as const, analysis };
    throw new QualificationError("Live AI is not configured. Demo replay supports only unchanged seeded relationships. This custom history has not been analyzed; review the notes manually or ask your administrator to enable live AI.", 503, "ai_not_configured");
  }
  if (!options.model?.trim()) throw new QualificationError("Live AI is not configured: OPENAI_MODEL is missing. This history has not been analyzed.", 503, "ai_not_configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000);
  try {
    const response = await (options.fetcher ?? fetch)("https://api.openai.com/v1/responses", {
      method: "POST", signal: controller.signal, headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: options.model, store: false, instructions: qualificationPrompt,
        input: [{ role: "user", content: JSON.stringify(input) }], max_output_tokens: 2000,
        text: { format: { type: "json_schema", name: "relationship_qualification", strict: true, schema: z.toJSONSchema(qualificationSchema) } },
      }),
    });
    if (!response.ok) throw new QualificationError("Live AI analysis is unavailable. Please retry.");
    const body = providerSchema.safeParse(await response.json());
    if (!body.success) throw new QualificationError("AI returned incomplete or invalid output. Please retry.");
    const content = body.data.output.filter(item => item.type === "message").flatMap(item => item.content ?? []);
    if (content.some(item => item.type === "refusal")) throw new QualificationError("AI could not analyze this history. Review the notes or retry.");
    const output = content.filter(item => item.type === "output_text").map(item => item.text ?? "").join("");
    let value: unknown;
    try { value = JSON.parse(output); } catch { throw new QualificationError("AI returned invalid JSON. Please retry."); }
    const analysis = qualificationSchema.safeParse(value);
    if (!analysis.success) throw new QualificationError("AI output failed validation. Please retry.");
    return { mode: "live" as const, analysis: analysis.data };
  } catch (error) {
    if (controller.signal.aborted) throw new QualificationError("AI analysis timed out. Please retry.", 504);
    if (error instanceof QualificationError) throw error;
    throw new QualificationError("AI analysis failed. Please retry.");
  } finally { clearTimeout(timer); }
}
