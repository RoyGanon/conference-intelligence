import { analyzeRelationship, QualificationError } from "@/lib/qualification-server";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const incoming = new URL(origin);
      const url = new URL(request.url);
      // Next's internal URL may use localhost while the browser uses 127.0.0.1.
      const host = request.headers.get("host") ?? url.host;
      if (incoming.host !== host || incoming.protocol !== url.protocol) return Response.json({ error: "Cross-origin analysis is not allowed." }, { status: 403, headers });
    } catch { return Response.json({ error: "Invalid request origin." }, { status: 403, headers }); }
  }
  try {
    const body = await request.text();
    if (body.length > 100000) return Response.json({ error: "History is too large to analyze." }, { status: 413, headers });
    let input: unknown;
    try { input = JSON.parse(body); } catch { return Response.json({ error: "Invalid JSON request." }, { status: 400, headers }); }
    return Response.json(await analyzeRelationship(input, { apiKey: process.env.OPENAI_API_KEY?.trim(), model: process.env.OPENAI_MODEL?.trim() }), { headers });
  } catch (error) {
    return Response.json({ error: error instanceof QualificationError ? error.message : "Analysis failed. Please retry." }, { status: error instanceof QualificationError ? error.status : 500, headers });
  }
}
