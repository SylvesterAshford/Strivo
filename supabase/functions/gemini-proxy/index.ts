// Supabase Edge Function — forward Google Gemini API requests.
//
// Why: Google Generative AI endpoints are not reliably reachable from inside
// Myanmar. Routing through this function (hosted on Supabase's global edge)
// gives the Next.js backend a stable path to Gemini regardless of where the
// caller's network can reach.
//
// Path mapping:
//   <function-url>/<anything> → https://generativelanguage.googleapis.com/<anything>
//
// Caller must hit this with a Supabase JWT or anon key in `Authorization`
// (Supabase enforces this at the gateway).
//
// The Gemini API key is taken from the function secret `GEMINI_API_KEY`.
// Set it via `supabase secrets set GEMINI_API_KEY=...` after deploy.

const GEMINI_HOST = "https://generativelanguage.googleapis.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors() });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonError(500, "GEMINI_API_KEY secret not set on this function");
  }

  // Extract everything after `/gemini-proxy` to forward verbatim.
  const url = new URL(req.url);
  const idx = url.pathname.indexOf("/gemini-proxy");
  const subPath = idx >= 0 ? url.pathname.slice(idx + "/gemini-proxy".length) : url.pathname;
  if (!subPath || subPath === "/") {
    return jsonError(400, "Missing path. Use /gemini-proxy/v1beta/models/...");
  }

  const upstream = new URL(GEMINI_HOST + subPath + url.search);

  // Inject the real Gemini API key. Strip any inbound auth/proxy headers so
  // we don't accidentally forward a Supabase JWT to Google.
  const headers = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (k.toLowerCase().startsWith("x-goog-")) continue;
    if (k.toLowerCase() === "authorization") continue;
    if (k.toLowerCase() === "host") continue;
    headers.set(k, v);
  }
  headers.set("x-goog-api-key", apiKey);

  try {
    const upstreamRes = await fetch(upstream.toString(), {
      method: req.method,
      headers,
      body: req.body,
      // @ts-expect-error — Deno fetch requires this for streamed bodies
      duplex: "half",
    });

    // Pass response through (status, headers, body). Add CORS for mobile.
    const out = new Headers(upstreamRes.headers);
    for (const [k, v] of Object.entries(cors())) out.set(k, v);
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: out,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(502, `Upstream fetch failed: ${message}`);
  }
});

function cors(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-goog-api-key",
  };
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json", ...cors() },
  });
}
