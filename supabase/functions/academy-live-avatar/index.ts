import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...cors, "Content-Type": "application/json" }
});
const API = "https://api.liveavatar.com/v1";
const learnerRoles = new Set(["owner", "agent", "team_lead", "manager"]);
const clamp = (v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);
    const token = authHeader.slice(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const pub = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default || Deno.env.get("SUPABASE_ANON_KEY")!;
    const sec = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, pub, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);
    const admin = createClient(supabaseUrl, sec, { auth: { persistSession: false, autoRefreshToken: false } });
    const userId = userData.user.id;
    const { data: profile } = await admin.from("profiles").select("id,role,status").eq("id", userId).single();
    if (!profile || ["inactive", "terminated"].includes(String(profile.status))) return json({ error: "Academy access unavailable" }, 403);
    if (!learnerRoles.has(String(profile.role))) return json({ error: "This account is not assigned a learner role" }, 403);

    const body = await req.json();
    const action = String(body.action || "status");
    const apiKey = String(Deno.env.get("LIVEAVATAR_API_KEY") || "").trim();
    const avatarId = String(Deno.env.get("LIVEAVATAR_AVATAR_ID") || "").trim();
    const requestedMode = String(Deno.env.get("LIVEAVATAR_MODE") || "FULL").trim().toUpperCase();
    const mode = requestedMode === "LITE" ? "LITE" : "FULL";
    const configured = !!apiKey && !!avatarId;
    const maxConfigured = clamp(Number(Deno.env.get("LIVEAVATAR_MAX_SESSION_SECONDS") || 1800) || 1800, 60, 7200);

    async function lessonAccess(lessonId: string) {
      const { data: lesson, error: lessonError } = await admin.from("academy_lessons").select("id,chapter_id,title,status").eq("id", lessonId).eq("status", "published").single();
      if (lessonError || !lesson) throw new Error("Lesson not found");
      const { data: chapter, error: chapterError } = await admin.from("academy_chapters").select("id,course_id").eq("id", lesson.chapter_id).single();
      if (chapterError || !chapter) throw new Error("Chapter not found");
      const { data: assignment } = await admin.from("course_assignments").select("id").eq("user_id", userId).eq("course_id", chapter.course_id).maybeSingle();
      if (!assignment) throw new Error("Course not assigned");
      return lesson;
    }

    async function provider(path: string, init: RequestInit) {
      const response = await fetch(`${API}${path}`, init);
      let payload: any = null;
      try { payload = await response.json(); } catch {}
      if (!response.ok || Number(payload?.code || 100) !== 100) {
        const message = String(payload?.message || payload?.detail?.[0]?.msg || `LiveAvatar request failed (${response.status})`);
        throw new Error(message);
      }
      return payload;
    }

    async function closeProviderSession(providerSessionId: string, reason = "USER_CLOSED") {
      if (!configured || !providerSessionId) return;
      try {
        await provider("/sessions/stop", {
          method: "POST",
          headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: providerSessionId, reason })
        });
      } catch {}
    }

    if (action === "status") {
      return json({
        ok: true,
        configured,
        mode,
        avatar_configured: !!avatarId,
        api_key_configured: !!apiKey,
        max_session_duration: maxConfigured,
        teaching_control: mode === "FULL" ? "avatar.speak_text" : "agent.speak",
        q_and_a_control: mode === "FULL" ? "avatar.speak_response" : null,
        setup_required: configured ? [] : [
          ...(!apiKey ? ["LIVEAVATAR_API_KEY"] : []),
          ...(!avatarId ? ["LIVEAVATAR_AVATAR_ID"] : [])
        ]
      });
    }

    if (!configured) return json({ error: "Live Ava is prepared but not authorized yet.", code: "LIVEAVATAR_NOT_CONFIGURED", setup_required: [!apiKey ? "LIVEAVATAR_API_KEY" : null, !avatarId ? "LIVEAVATAR_AVATAR_ID" : null].filter(Boolean) }, 503);

    if (action === "create_session") {
      const lessonId = String(body.lesson_id || "");
      if (!lessonId) return json({ error: "Missing lesson id" }, 400);
      const lesson = await lessonAccess(lessonId);

      const { data: active } = await admin.from("academy_liveavatar_sessions")
        .select("id,provider_session_id")
        .eq("user_id", userId).eq("status", "active");
      for (const prior of active || []) {
        if (prior.provider_session_id) await closeProviderSession(String(prior.provider_session_id), "USER_CLOSED");
        await admin.from("academy_liveavatar_sessions").update({ status: "closed", ended_at: new Date().toISOString(), end_reason: "REPLACED_BY_NEW_SESSION", updated_at: new Date().toISOString() }).eq("id", prior.id);
      }

      const requestedMax = clamp(Number(body.max_session_duration || maxConfigured) || maxConfigured, 60, maxConfigured);
      const tokenBody: Record<string, unknown> = {
        avatar_id: avatarId,
        mode,
        is_sandbox: false,
        video_settings: { quality: "high", encoding: "H264" },
        max_session_duration: requestedMax
      };
      if (mode === "FULL") tokenBody.interactivity_type = "PUSH_TO_TALK";

      const tokenResult = await provider("/sessions/token", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(tokenBody)
      });
      const sessionId = String(tokenResult?.data?.session_id || "");
      const sessionToken = String(tokenResult?.data?.session_token || "");
      if (!sessionId || !sessionToken) throw new Error("LiveAvatar did not return a usable session token");

      const startResult = await provider("/sessions/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      const started = startResult?.data || {};
      const startedSessionId = String(started.session_id || sessionId);
      if (startedSessionId !== sessionId) throw new Error("LiveAvatar session identity mismatch");

      const now = new Date().toISOString();
      await admin.from("academy_liveavatar_sessions").insert({
        user_id: userId,
        lesson_id: lessonId,
        provider_session_id: sessionId,
        mode,
        status: "active",
        started_at: now,
        metadata: { lesson_title: lesson.title, max_session_duration: Number(started.max_session_duration || requestedMax), video_quality: "high", encoding: "H264" },
        created_at: now,
        updated_at: now
      });

      return json({
        ok: true,
        mode,
        session_id: sessionId,
        livekit_url: started.livekit_url || null,
        livekit_client_token: started.livekit_client_token || null,
        max_session_duration: Number(started.max_session_duration || requestedMax),
        event_transport: mode === "FULL" ? "livekit-data" : "websocket",
        controls: mode === "FULL" ? { teach: "avatar.speak_text", ask_ava: "avatar.speak_response", interrupt: "avatar.interrupt" } : { teach_audio: "agent.speak", interrupt: "agent.interrupt" }
      }, 201);
    }

    if (action === "keep_alive") {
      const providerSessionId = String(body.session_id || "");
      if (!providerSessionId) return json({ error: "Missing session id" }, 400);
      const { data: owned } = await admin.from("academy_liveavatar_sessions").select("id,status").eq("user_id", userId).eq("provider_session_id", providerSessionId).eq("status", "active").maybeSingle();
      if (!owned) return json({ error: "Active Ava session not found" }, 404);
      await provider("/sessions/keep-alive", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: providerSessionId })
      });
      const now = new Date().toISOString();
      await admin.from("academy_liveavatar_sessions").update({ last_keepalive_at: now, updated_at: now }).eq("id", owned.id);
      return json({ ok: true, session_id: providerSessionId, kept_alive_at: now });
    }

    if (action === "stop_session") {
      const providerSessionId = String(body.session_id || "");
      if (!providerSessionId) return json({ error: "Missing session id" }, 400);
      const { data: owned } = await admin.from("academy_liveavatar_sessions").select("id,status").eq("user_id", userId).eq("provider_session_id", providerSessionId).maybeSingle();
      if (!owned) return json({ error: "Ava session not found" }, 404);
      if (owned.status === "active") await closeProviderSession(providerSessionId, "USER_CLOSED");
      const now = new Date().toISOString();
      await admin.from("academy_liveavatar_sessions").update({ status: "closed", ended_at: now, end_reason: "USER_CLOSED", updated_at: now }).eq("id", owned.id);
      return json({ ok: true, session_id: providerSessionId, stopped_at: now });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
