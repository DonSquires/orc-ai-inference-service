import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const INFERENCE_SERVICE_URL = Deno.env.get("INFERENCE_SERVICE_URL") ?? "";

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    !origin || ALLOWED.length === 0 || ALLOWED.includes(origin)
      ? origin ?? "*"
      : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }

  let body: {
    image: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
    recordedAt?: string;
    officerId?: string;
    idempotencyKey?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }

  const { image, gpsLatitude, gpsLongitude, recordedAt, officerId, idempotencyKey } = body;

  if (typeof image !== "string" || !image.includes(",")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid image (base64 dataURL expected)" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      }
    );
  }

  if (!INFERENCE_SERVICE_URL) {
    return new Response(
      JSON.stringify({ error: "INFERENCE_SERVICE_URL is not configured" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      }
    );
  }

  // Forward image to the inference service
  let inferResult: unknown;
  try {
    const inferResp = await fetch(`${INFERENCE_SERVICE_URL}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });

    if (!inferResp.ok) {
      const errText = await inferResp.text();
      return new Response(
        JSON.stringify({ error: "Inference service error", detail: errText }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        }
      );
    }

    inferResult = await inferResp.json();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to reach inference service", detail: String(err) }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      }
    );
  }

  // No database writes yet — return success with inference result
  return new Response(
    JSON.stringify({
      ok: true,
      inference: inferResult,
      meta: { gpsLatitude, gpsLongitude, recordedAt, officerId, idempotencyKey },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    }
  );
});
