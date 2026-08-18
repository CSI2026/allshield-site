import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);
    const token = authHeader.slice(7);
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const url = Deno.env.get("SUPABASE_URL")!;
    const publishableKey = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY")!;
    const secretKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, publishableKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);
    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile } = await admin.from("profiles").select("id,role,status,resident_state").eq("id", userData.user.id).single();
    if (!profile || ["inactive", "terminated"].includes(profile.status)) return json({ error: "Account is not eligible for academy access" }, 403);
    const body = await req.json();
    const action = String(body.action || "start");

    if (action === "start") {
      const state = String(body.state_code || profile.resident_state || "").trim().toUpperCase() || null;
      const { data: questions, error } = await admin.from("question_bank").select("id,category,state_code,prompt,answers").eq("status", "published").or(state ? `state_code.is.null,state_code.eq.${state}` : "state_code.is.null");
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, exam_type: "practice", state_code: state, pass_mark: 85, notice: "Internal Allshield readiness practice. This is not a state licensing examination or a substitute for state-required education.", questions: shuffled(questions || []).slice(0, Math.min(10, questions?.length || 0)) });
    }

    if (action === "submit") {
      const responses = Array.isArray(body.responses) ? body.responses : [];
      if (!responses.length) return json({ error: "No responses submitted" }, 400);
      const ids = responses.map((r: any) => String(r.id || "")).filter(Boolean);
      const { data: questions, error } = await admin.from("question_bank").select("id,correct_answer_key,explanation").in("id", ids).eq("status", "published");
      if (error) return json({ error: error.message }, 400);
      const map = new Map((questions || []).map((q: any) => [q.id, q]));
      let correct = 0;
      const review = responses.map((r: any) => {
        const q: any = map.get(String(r.id));
        const good = !!q && String(r.answer || "") === q.correct_answer_key;
        if (good) correct++;
        return { id: String(r.id), correct: good, explanation: q?.explanation || null };
      });
      const count = responses.length;
      const score = Number(((correct / count) * 100).toFixed(2));
      const state = String(body.state_code || profile.resident_state || "").trim().toUpperCase() || null;
      const passed = score >= 85;
      const { error: insertError } = await admin.from("exam_attempts").insert({ user_id: profile.id, exam_type: "practice", state_code: state, score_percent: score, question_count: count, correct_count: correct, attempt_payload: { responses: responses.map((r: any) => ({ id: String(r.id), answer: String(r.answer || "") })), passed } });
      if (insertError) return json({ error: insertError.message }, 400);
      if (state) {
        const { data: lic } = await admin.from("user_state_licenses").select("id,readiness_percent").eq("user_id", profile.id).eq("state_code", state).maybeSingle();
        if (lic && score > Number(lic.readiness_percent || 0)) await admin.from("user_state_licenses").update({ readiness_percent: score }).eq("id", lic.id);
      }
      if (passed) await admin.from("onboarding_progress").update({ completed: true, completed_at: new Date().toISOString(), metadata: { source: "practice_exam", score_percent: score, pass_mark: 85 } }).eq("user_id", profile.id).eq("step_key", "test");
      return json({ ok: true, score_percent: score, correct_count: correct, question_count: count, passed, pass_mark: 85, review });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
