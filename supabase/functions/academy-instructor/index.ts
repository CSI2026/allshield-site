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
const TYPES = new Set(["study", "listen", "lesson_quiz", "chapter_exam", "state_exam"]);
const MODES = new Set(["read", "listen"]);
const stateCode = (v: unknown) => String(v || "").trim().toUpperCase().slice(0, 2) || null;

const AVA_IMAGE = "https://xxeiddnfbdqxwuojuggy.supabase.co/storage/v1/object/public/academy-media/instructors/ava/canonical-frame.webp";
const AVA_WELCOME = "https://xxeiddnfbdqxwuojuggy.supabase.co/storage/v1/object/public/academy-media/instructors/ava/welcome-canonical-v3.mp4";
const FACULTY: Record<string, any> = {
  ava: {
    name: "Ava",
    style: "Warm, clear & professional",
    voice_id: "330290724a1b470fb63153f34d4c0183",
    avatar_id: "Emery_public_6",
    image_url: AVA_IMAGE,
    welcome_video_url: AVA_WELCOME,
    guided_voice: "marin",
    canonical: true
  },
  maya: {
    name: "Maya", style: "Calm & clear",
    voice_id: "06672207805f41a9ad0af6797f8aa14b",
    avatar_id: "81708c00d9824a17a0a88c5666d2c2ac",
    image_url: "https://resource2.heygen.ai/public-avatars/Liza/paos/angles/office84_p1_a0.jpg",
    guided_voice: "coral"
  },
  jordan: {
    name: "Jordan", style: "Patient & reassuring",
    voice_id: "03fcf8ecb0a94b6b94e9007edb7c35f8",
    avatar_id: "f59cc9c022094549a49f09b33159c4eb",
    image_url: "https://resource2.heygen.ai/public-avatars/Dashiell/paos/angles/office84_p1_a1.jpg",
    guided_voice: "cedar"
  },
  marcus: {
    name: "Marcus", style: "Direct & professional",
    voice_id: "88bb9ee1c81b466eb2a08fdde86d3619",
    avatar_id: "94aa5a1f0e39427da9a213f65f793caa",
    image_url: "https://resource2.heygen.ai/public-avatars/Sebastian/paos/angles/office86_p3_a1.jpg",
    guided_voice: "onyx"
  }
};

const hex = async (input: string) => {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);
    const token = authHeader.slice(7);
    const url = Deno.env.get("SUPABASE_URL")!;
    const pub = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default || Deno.env.get("SUPABASE_ANON_KEY")!;
    const sec = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, pub, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);
    const admin = createClient(url, sec, { auth: { persistSession: false, autoRefreshToken: false } });
    const userId = userData.user.id;
    const { data: profile } = await admin.from("profiles").select("id,role,status,resident_state").eq("id", userId).single();
    if (!profile || ["inactive", "terminated"].includes(String(profile.status))) return json({ error: "Academy access unavailable" }, 403);

    const body = await req.json();
    const action = String(body.action || "");

    async function lessonAccess(lessonId: string) {
      const { data: lesson, error: lessonError } = await admin.from("academy_lessons").select("id,chapter_id,title,content").eq("id", lessonId).single();
      if (lessonError || !lesson) throw new Error("Lesson not found");
      const { data: chapter, error: chapterError } = await admin.from("academy_chapters").select("id,course_id,title").eq("id", lesson.chapter_id).single();
      if (chapterError || !chapter) throw new Error("Chapter not found");
      const { data: course, error: courseError } = await admin.from("courses").select("id,state_code,title").eq("id", chapter.course_id).single();
      if (courseError || !course) throw new Error("Course not found");
      const { data: assignment } = await admin.from("course_assignments").select("id").eq("user_id", userId).eq("course_id", course.id).maybeSingle();
      if (!assignment) throw new Error("Course not assigned");
      return { lesson, chapter, course };
    }

    async function chapterAccess(chapterId: string) {
      const { data: chapter, error: chapterError } = await admin.from("academy_chapters").select("id,course_id").eq("id", chapterId).single();
      if (chapterError || !chapter) throw new Error("Chapter not found");
      const { data: course, error: courseError } = await admin.from("courses").select("id,state_code").eq("id", chapter.course_id).single();
      if (courseError || !course) throw new Error("Course not found");
      const { data: assignment } = await admin.from("course_assignments").select("id").eq("user_id", userId).eq("course_id", course.id).maybeSingle();
      if (!assignment) throw new Error("Course not assigned");
      return { chapter, course };
    }

    async function preference() {
      const { data, error } = await admin.from("academy_instructor_preferences")
        .select("instructor_key,voice_id,avatar_id,guided_enabled,guided_voice,guided_speed,introduction_seen_at,updated_at")
        .eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data || null;
    }

    const canonicalRow = (key: string, prior: any, extra: Record<string, unknown> = {}) => {
      const faculty = FACULTY[key] || FACULTY.ava;
      return {
        user_id: userId,
        instructor_key: key,
        voice_id: faculty.voice_id,
        avatar_id: faculty.avatar_id,
        guided_voice: String(prior?.guided_voice || faculty.guided_voice || "marin"),
        guided_enabled: prior?.guided_enabled ?? false,
        guided_speed: Number(prior?.guided_speed || 1),
        updated_at: new Date().toISOString(),
        ...extra
      };
    };

    if (action === "faculty") {
      const pref = await preference();
      return json({
        ok: true,
        faculty: FACULTY,
        preference: pref,
        canonical_instructor_key: "ava",
        professional_audio_ready: !!Deno.env.get("OPENAI_API_KEY")
      });
    }

    if (action === "set_instructor") {
      const key = String(body.instructor_key || "").toLowerCase();
      if (!FACULTY[key]) return json({ error: "Choose a valid instructor" }, 400);
      const prior = await preference();
      const row = canonicalRow(key, prior);
      const { error } = await admin.from("academy_instructor_preferences").upsert(row, { onConflict: "user_id" });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, preference: row, instructor: FACULTY[key] });
    }

    if (action === "set_guided") {
      const prior = await preference();
      const key = FACULTY[String(prior?.instructor_key || "ava")] ? String(prior?.instructor_key || "ava") : "ava";
      const speed = Math.max(.75, Math.min(1.5, Number(body.speed || prior?.guided_speed || 1)));
      const row = canonicalRow(key, prior, { guided_enabled: !!body.enabled, guided_speed: speed });
      const { error } = await admin.from("academy_instructor_preferences").upsert(row, { onConflict: "user_id" });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, preference: row });
    }

    if (action === "mark_introduction_seen") {
      const prior = await preference();
      const key = FACULTY[String(prior?.instructor_key || "ava")] ? String(prior?.instructor_key || "ava") : "ava";
      const row = canonicalRow(key, prior, { introduction_seen_at: new Date().toISOString() });
      const { error } = await admin.from("academy_instructor_preferences").upsert(row, { onConflict: "user_id" });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, preference: row });
    }

    if (action === "segments") {
      const lessonId = String(body.lesson_id || "");
      if (!lessonId) return json({ error: "Missing lesson id" }, 400);
      await lessonAccess(lessonId);
      const { data, error } = await admin.from("academy_instructor_segments")
        .select("segment_order,segment_title,section_ref,media_url,duration_seconds,provider,status")
        .eq("lesson_id", lessonId).eq("status", "ready").not("media_url", "is", null).order("segment_order", { ascending: true });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, lesson_id: lessonId, segments: data || [] });
    }

    if (action === "guided_audio") {
      const lessonId = String(body.lesson_id || "");
      const text = String(body.text || "").trim();
      if (!lessonId || !text) return json({ error: "Lesson and text are required" }, 400);
      await lessonAccess(lessonId);
      if (text.length > 3900) return json({ error: "Guided section is too long; split it into smaller sections." }, 400);
      const pref = await preference();
      const voice = String(pref?.guided_voice || "marin");
      const speed = Math.max(.75, Math.min(1.5, Number(body.speed || pref?.guided_speed || 1)));
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) return json({ error: "Professional guided narration is not configured." }, 503);
      const hash = await hex(`${voice}|${speed}|${text}`);
      const path = `guided-audio/${lessonId}/${hash}.mp3`;
      let signed = await admin.storage.from("academy-media").createSignedUrl(path, 60 * 60 * 12);
      if (signed.data?.signedUrl) return json({ ok: true, audio_url: signed.data.signedUrl, cached: true, voice, speed });
      const speech = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts", voice, input: text,
          instructions: "Speak like an experienced professional insurance instructor in a calm, warm classroom tone. Sound human and conversational, not promotional or robotic. Use natural pauses for headings, definitions, examples, and exam tips. Pronounce ALLSHIELD as All Shield.",
          response_format: "mp3", speed
        })
      });
      if (!speech.ok) {
        let message = `Voice provider error ${speech.status}`;
        try { const e = await speech.json(); message = e?.error?.message || message; } catch {}
        return json({ error: message }, 502);
      }
      const audio = new Uint8Array(await speech.arrayBuffer());
      const { error: uploadError } = await admin.storage.from("academy-media").upload(path, audio, { contentType: "audio/mpeg", upsert: true, cacheControl: "31536000" });
      if (uploadError) return json({ error: uploadError.message }, 500);
      signed = await admin.storage.from("academy-media").createSignedUrl(path, 60 * 60 * 12);
      if (!signed.data?.signedUrl) return json({ error: "Guided audio was created but could not be opened." }, 500);
      return json({ ok: true, audio_url: signed.data.signedUrl, cached: false, voice, speed });
    }

    if (action === "get_resume") {
      const lessonId = String(body.lesson_id || "");
      if (!lessonId) return json({ error: "Missing lesson id" }, 400);
      await lessonAccess(lessonId);
      const { data, error } = await admin.from("academy_lesson_progress").select("resume_percent,last_mode,active_seconds,last_opened_at").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle();
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, resume_percent: Number(data?.resume_percent || 0), mode: String(data?.last_mode || "read"), active_seconds: Number(data?.active_seconds || 0), last_opened_at: data?.last_opened_at || null });
    }

    if (action === "save_resume") {
      const lessonId = String(body.lesson_id || "");
      if (!lessonId) return json({ error: "Missing lesson id" }, 400);
      await lessonAccess(lessonId);
      const resume = Math.max(0, Math.min(100, Number(body.resume_percent || 0)));
      const mode = MODES.has(String(body.mode || "read")) ? String(body.mode || "read") : "read";
      const now = new Date().toISOString();
      const { data: existing } = await admin.from("academy_lesson_progress").select("id").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle();
      if (existing) {
        const { error } = await admin.from("academy_lesson_progress").update({ resume_percent: resume, last_mode: mode, last_opened_at: now, updated_at: now }).eq("id", existing.id);
        if (error) return json({ error: error.message }, 400);
      } else {
        const { error } = await admin.from("academy_lesson_progress").insert({ user_id: userId, lesson_id: lessonId, status: "in_progress", active_seconds: 0, resume_percent: resume, last_mode: mode, started_at: now, last_opened_at: now, updated_at: now });
        if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true, resume_percent: resume, mode });
    }

    if (action === "record_activity") {
      const type = String(body.activity_type || "");
      if (!TYPES.has(type)) return json({ error: "Invalid activity type" }, 400);
      const seconds = Math.max(1, Math.min(60, Math.round(Number(body.seconds || 0))));
      if (!Number.isFinite(seconds)) return json({ error: "Invalid seconds" }, 400);
      let lessonId = body.lesson_id ? String(body.lesson_id) : null;
      let chapterId = body.chapter_id ? String(body.chapter_id) : null;
      let examSessionId = body.exam_session_id ? String(body.exam_session_id) : null;
      let state = stateCode(body.state_code || profile.resident_state);
      let contextKey = "";
      if (lessonId) {
        const access = await lessonAccess(lessonId);
        chapterId = String(access.chapter.id);
        state = stateCode(access.course.state_code);
        contextKey = `lesson:${lessonId}`;
      } else if (chapterId) {
        const access = await chapterAccess(chapterId);
        state = stateCode(access.course.state_code);
        contextKey = `chapter:${chapterId}`;
      } else if (examSessionId) {
        const { data: exam } = await admin.from("exam_sessions").select("id,state_code").eq("id", examSessionId).eq("user_id", userId).maybeSingle();
        if (!exam) return json({ error: "Exam session not found" }, 404);
        state = stateCode(exam.state_code);
        contextKey = `exam:${examSessionId}`;
      } else contextKey = `state:${state || "NA"}`;
      const { data: existing, error: readError } = await admin.from("academy_activity_totals").select("id,active_seconds").eq("user_id", userId).eq("context_key", contextKey).eq("activity_type", type).maybeSingle();
      if (readError) return json({ error: readError.message }, 400);
      const now = new Date().toISOString();
      const next = Math.min(604800, Number(existing?.active_seconds || 0) + seconds);
      const values = { active_seconds: next, last_active_at: now, state_code: state, lesson_id: lessonId, chapter_id: chapterId, exam_session_id: examSessionId };
      if (existing) {
        const { error } = await admin.from("academy_activity_totals").update(values).eq("id", existing.id);
        if (error) return json({ error: error.message }, 400);
      } else {
        const { error } = await admin.from("academy_activity_totals").insert({ user_id: userId, context_key: contextKey, activity_type: type, ...values, started_at: now });
        if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true, activity_type: type, active_seconds: next });
    }

    if (action === "summary") {
      const { data, error } = await admin.from("academy_activity_totals").select("activity_type,state_code,active_seconds,last_active_at").eq("user_id", userId);
      if (error) return json({ error: error.message }, 400);
      const totals: Record<string, number> = { study: 0, listen: 0, lesson_quiz: 0, chapter_exam: 0, state_exam: 0 };
      for (const row of data || []) totals[String(row.activity_type)] = (totals[String(row.activity_type)] || 0) + Number(row.active_seconds || 0);
      const { data: exams } = await admin.from("exam_sessions").select("started_at,completed_at").eq("user_id", userId).not("completed_at", "is", null);
      let derived = 0;
      for (const exam of exams || []) derived += Math.max(0, Math.round((new Date(exam.completed_at).getTime() - new Date(exam.started_at).getTime()) / 1000));
      totals.state_exam = Math.max(totals.state_exam, derived);
      const totalSeconds = totals.study + totals.lesson_quiz + totals.chapter_exam + totals.state_exam;
      return json({ ok: true, totals, total_seconds: totalSeconds, listen_seconds: totals.listen });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
