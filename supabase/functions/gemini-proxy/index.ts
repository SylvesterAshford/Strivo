// Supabase Edge Function — forward Google Gemini API requests with
// multi-key rotation and quota failover.
//
// Why: Google Generative AI endpoints are not reliably reachable from inside
// Myanmar. Routing through this function (hosted on Supabase's global edge)
// gives the Next.js backend a stable path to Gemini regardless of where the
// caller's network can reach. With multiple keys, free-tier per-key quotas
// stack so the app can absorb bursts without 429s.
//
// Path mapping:
//   <function-url>/<anything> → https://generativelanguage.googleapis.com/<anything>
//
// Caller must hit this with a Supabase JWT or anon key in `Authorization`
// (Supabase enforces this at the gateway).
//
// API keys are taken from one of two secrets (checked in order):
//   GEMINI_API_KEYS  — comma-separated, recommended ("k1,k2,k3")
//   GEMINI_API_KEY   — single key (legacy)
//
// Set with:
//   supabase secrets set GEMINI_API_KEYS="key1,key2,key3"
// then:
//   supabase functions deploy gemini-proxy

const GEMINI_HOST = "https://generativelanguage.googleapis.com";

// Load keys once at boot. Each Deno instance gets its own rotation counter.
const KEYS: string[] = (
  Deno.env.get("GEMINI_API_KEYS") ??
  Deno.env.get("GEMINI_API_KEY") ??
  ""
)
  .split(",")
  // Strip ALL whitespace (including embedded \n that some secret-setting
  // tools inject when keys are multi-line) — a key with a newline in the
  // middle will fail with "Invalid header value" at the fetch call.
  .map((s) => s.replace(/\s+/g, ""))
  .filter(Boolean);

// Module-level cursor — round-robin per request across the keys we have.
// Instances aren't shared across Deno workers, so this is "good enough"
// load spread, not a guarantee. Combined with failover that's fine.
let rotation = 0;
function nextStartIndex(): number {
  const i = rotation % Math.max(KEYS.length, 1);
  rotation = (rotation + 1) % Number.MAX_SAFE_INTEGER;
  return i;
}

// HTTP status codes / body patterns that mean "this specific key is bad"
// → worth retrying with a different key.
function isKeyError(status: number, bodyText: string): boolean {
  if (status === 429 || status === 403) return true;
  // 400 with API_KEY_INVALID means the key itself is expired/revoked.
  if (status === 400 && /API_KEY_INVALID|key expired|INVALID_ARGUMENT.*key/i.test(bodyText)) return true;
  return false;
}

Deno.serve(async (req) => {
  try {
    return await handle(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonError(500, `Edge handler crashed: ${message}`);
  }
});

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors() });
  }

  // Extract everything after `/gemini-proxy` to forward verbatim.
  const url = new URL(req.url);
  const idx = url.pathname.indexOf("/gemini-proxy");
  const subPath = idx >= 0 ? url.pathname.slice(idx + "/gemini-proxy".length) : url.pathname;
  if (!subPath || subPath === "/") {
    return jsonError(400, "Missing path. Use /gemini-proxy/v1beta/models/...");
  }

  const upstream = new URL(GEMINI_HOST + subPath + url.search);

  // Buffer the request body once so we can retry with a different key.
  // (req.body is a stream; you can only read it once.)
  let bodyBytes: Uint8Array | undefined;
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      const buf = await req.arrayBuffer();
      if (buf.byteLength > 0) bodyBytes = new Uint8Array(buf);
    }
  } catch (err) {
    return jsonError(400, `Could not read request body: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Capture the caller's own API key before stripping x-goog-* headers.
  // Used as a final fallback if every key in GEMINI_API_KEYS is expired.
  const callerKey = req.headers.get("x-goog-api-key") ?? "";

  // Build base headers — strip Supabase auth + any Google-specific headers
  // so we replace them cleanly with our own key rotation below.
  const baseHeaders = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (k.toLowerCase().startsWith("x-goog-")) continue;
    if (k.toLowerCase() === "authorization") continue;
    if (k.toLowerCase() === "host") continue;
    if (k.toLowerCase() === "content-length") continue;
    baseHeaders.set(k, v);
  }

  // Build the key pool: rotated proxy keys first, then the caller's own key
  // as a last-resort fallback (useful when the proxy keys have all expired).
  const keyPool = callerKey ? [...KEYS, callerKey] : KEYS;
  if (keyPool.length === 0) {
    return jsonError(500, "No Gemini key configured.");
  }

  // Try each key in rotation order; stop on first non-key-error response.
  const startIdx = nextStartIndex();
  let lastRes: Response | null = null;
  for (let i = 0; i < keyPool.length; i++) {
    const keyIdx = (startIdx + i) % keyPool.length;
    const headers = new Headers(baseHeaders);
    headers.set("x-goog-api-key", keyPool[keyIdx]);

    try {
      const init: RequestInit = { method: req.method, headers };
      if (bodyBytes) init.body = bodyBytes;
      const res = await fetch(upstream.toString(), init);

      // Materialize the body so we can inspect it for key errors AND
      // so we can safely retry with the next key (body stream exhausted once).
      const materialized = await materialize(res);
      const bodyText = await materialized.clone().text().catch(() => "");

      // Success OR genuine non-key failure → return verbatim.
      if (!isKeyError(res.status, bodyText)) {
        return passThrough(materialized);
      }

      // Key-specific error (expired, rate-limited, forbidden) — try next key.
      lastRes = materialized;
      // Avoid hammering on bursts.
      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return jsonError(502, `Upstream fetch failed: ${message}`);
    }
  }

  // Every key returned 429/403 — fall through with the last response so the
  // backend's retry layer can decide what to do.
  return lastRes ? passThrough(lastRes) : jsonError(502, "All keys exhausted");
}

// Build a fresh Response with the upstream body + CORS headers.
function passThrough(res: Response): Response {
  const out = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors())) out.set(k, v);
  return new Response(res.body, { status: res.status, headers: out });
}

// Convert a streaming Response into one whose body has already been read,
// so we can safely store it while trying another key.
async function materialize(res: Response): Promise<Response> {
  const buf = await res.arrayBuffer();
  return new Response(buf, { status: res.status, headers: res.headers });
}

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
