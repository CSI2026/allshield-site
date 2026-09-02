const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...cors, "Content-Type": "application/json" }
});

// ALLSHIELD has permanently disabled metered LiveAvatar sessions. The Academy
// uses stored instructor videos first and the browser's built-in speech engine
// as its zero-subscription fallback.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let action = "status";
  try {
    const body = await req.json();
    action = String(body?.action || "status");
  } catch {
    // A status response is still safe when the request body is empty.
  }

  if (action === "status") {
    return json({
      ok: true,
      configured: false,
      disabled: true,
      billing_mode: "no_new_fees",
      instructor_delivery: ["stored_video", "browser_speech"],
      setup_required: []
    });
  }

  return json({
    error: "Metered LiveAvatar sessions are disabled. ALLSHIELD uses its no-fee instructor delivery instead.",
    code: "LIVEAVATAR_DISABLED_NO_FEE_POLICY"
  }, 410);
});
