import { exportHubspot, HubspotError } from "@/lib/hubspot-server";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const origin = request.headers.get("origin");
  if (!origin) return Response.json({ error: "An explicit same-origin browser request is required." }, { status: 403, headers });
  try {
    const incoming = new URL(origin);
    const url = new URL(request.url);
    if (incoming.host !== (request.headers.get("host") ?? url.host) || incoming.protocol !== url.protocol)
      return Response.json({ error: "Cross-origin export is not allowed." }, { status: 403, headers });
  } catch { return Response.json({ error: "Invalid request origin." }, { status: 403, headers }); }
  try {
    const body = await request.text();
    if (body.length > 4000) return Response.json({ error: "Export request is too large." }, { status: 413, headers });
    let input: unknown;
    try { input = JSON.parse(body); } catch { return Response.json({ error: "Invalid JSON request." }, { status: 400, headers }); }
    return Response.json(await exportHubspot(input, { token: process.env.HUBSPOT_ACCESS_TOKEN }), { headers });
  } catch (error) {
    return Response.json({ error: error instanceof HubspotError ? error.message : "HubSpot export failed. Saved local data is unaffected." }, { status: error instanceof HubspotError ? error.status : 500, headers });
  }
}
