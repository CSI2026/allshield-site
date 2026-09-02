import { createClient } from "npm:@supabase/supabase-js@2";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
function first(...vals: any[]) { return vals.find(v => v !== undefined && v !== null && String(v).trim() !== ""); }
function allowedHeyGenUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && ["files2.heygen.ai", "resource2.heygen.ai"].includes(u.hostname);
  } catch { return false; }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const data = body?.event_data || body?.data || body || {};
  const callbackId = String(first(data.callback_id, data.callbackId, body.callback_id, body.callbackId) || "").trim();
  if (!callbackId || callbackId.length < 24) return json({ error: "invalid callback" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: job } = await admin.from("academy_instructor_video_jobs").select("id,lesson_id,lesson_code,part,part_title,callback_id,heygen_job_id").eq("callback_id", callbackId).maybeSingle();
  if (!job) return json({ error: "unknown callback" }, 401);

  const eventType = String(body?.event_type || body?.event || "").toLowerCase();
  const explicitStatus = String(first(data.status, body.status) || "").toLowerCase();
  const failed = eventType.includes("fail") || ["failed", "error"].includes(explicitStatus);
  const videoUrl = String(first(data.video_url, data.url, data.videoUrl, body.video_url, body.url, body.videoUrl) || "").trim();
  const captionUrl = String(first(data.caption_url, data.subtitle_url, data.captionUrl, data.subtitleUrl) || "").trim();
  const incomingJobId = String(first(data.video_id, data.videoId, data.lipsync_id, data.lipsyncId, body.video_id, body.videoId, body.lipsync_id, body.lipsyncId) || "").trim();
  const failureMessage = String(first(data.failure_message, data.error, data.message, body.failure_message, body.error, body.message) || "").trim();
  const duration = Number(first(data.duration, data.duration_seconds, body.duration, body.duration_seconds) || 0) || null;

  if (incomingJobId && job.heygen_job_id && incomingJobId !== job.heygen_job_id) return json({ error: "job mismatch" }, 401);
  if (videoUrl && !allowedHeyGenUrl(videoUrl)) return json({ error: "invalid media host" }, 400);

  await admin.from("academy_instructor_video_jobs").update({
    status: failed ? "failed" : (videoUrl ? "rendered" : (explicitStatus || "callback_received")),
    heygen_video_url: videoUrl || null,
    caption_url: captionUrl || null,
    failure_message: failureMessage || null,
    raw_callback: body,
    updated_at: new Date().toISOString()
  }).eq("id", job.id);

  await admin.from("academy_instructor_segments").update({
    provider: "heygen",
    provider_job_id: incomingJobId || job.heygen_job_id || null,
    status: failed ? "failed" : (videoUrl ? "rendered" : "rendering"),
    duration_seconds: duration,
    metadata: { callback_id: callbackId, caption_url: captionUrl || null, failure_message: failureMessage || null },
    updated_at: new Date().toISOString()
  }).eq("lesson_id", job.lesson_id).eq("segment_order", Number(job.part));

  if (failed || !videoUrl) return json({ ok: true, status: failed ? "failed" : "received" });

  const work = async () => {
    try {
      const media = await fetch(videoUrl);
      if (!media.ok) throw new Error(`HeyGen download failed ${media.status}`);
      const bytes = new Uint8Array(await media.arrayBuffer());
      const suffix = Number(job.part) > 1 ? `-part-${job.part}` : "";
      const path = `courses/tx/ava/${job.lesson_code}${suffix}.mp4`;
      const { error: uploadErr } = await admin.storage.from("academy-media").upload(path, bytes, { contentType: "video/mp4", cacheControl: "31536000", upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: pub } = admin.storage.from("academy-media").getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      const now = new Date().toISOString();

      await admin.from("academy_instructor_segments").update({
        provider: "heygen",
        provider_job_id: incomingJobId || job.heygen_job_id || null,
        media_url: publicUrl,
        duration_seconds: duration,
        status: "ready",
        updated_at: now
      }).eq("lesson_id", job.lesson_id).eq("segment_order", Number(job.part));

      const { data: allSegments, error: segErr } = await admin.from("academy_instructor_segments")
        .select("segment_order,segment_title,section_ref,provider,provider_job_id,media_url,duration_seconds,status")
        .eq("lesson_id", job.lesson_id)
        .order("segment_order", { ascending: true });
      if (segErr) throw segErr;
      const contiguous: any[] = [];
      for (const seg of allSegments || []) {
        if (String(seg.status) !== "ready" || !seg.media_url) break;
        contiguous.push(seg);
      }

      const { data: lesson, error: lessonErr } = await admin.from("academy_lessons").select("id,content").eq("id", job.lesson_id).single();
      if (lessonErr || !lesson) throw new Error(`lesson lookup failed: ${lessonErr?.message || job.lesson_code}`);
      const content: any = lesson.content && typeof lesson.content === "object" ? { ...lesson.content } : {};
      content.instructor_video_urls = contiguous.map((s:any) => s.media_url);
      content.instructor_video_url = content.instructor_video_urls[0] || null;
      content.instructor_video_segments = contiguous.map((s:any) => ({
        order_index: Number(s.segment_order),
        segment_title: s.segment_title,
        section_ref: s.section_ref || null,
        media_url: s.media_url,
        duration_seconds: s.duration_seconds === null ? null : Number(s.duration_seconds),
        provider: s.provider || "heygen",
        provider_job_id: s.provider_job_id || null
      }));
      content.instructor_video_provider = "multi-segment";
      content.instructor_video_identity = "ava-canonical";
      content.instructor_voice_id = "9d027359b2404e46af2f7ca5e84cf98f";
      content.instructor_video_updated_at = now;
      const { error: updateErr } = await admin.from("academy_lessons").update({ content, updated_at: now }).eq("id", lesson.id);
      if (updateErr) throw updateErr;

      await admin.from("academy_instructor_video_jobs").update({ status: "complete", storage_path: path, public_url: publicUrl, completed_at: now, updated_at: now }).eq("id", job.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await admin.from("academy_instructor_video_jobs").update({ status: "ingest_failed", failure_message: message, updated_at: new Date().toISOString() }).eq("id", job.id);
      await admin.from("academy_instructor_segments").update({ status: "ingest_failed", metadata: { callback_id: callbackId, failure_message: message }, updated_at: new Date().toISOString() }).eq("lesson_id", job.lesson_id).eq("segment_order", Number(job.part));
    }
  };
  // @ts-ignore Supabase Edge Runtime global
  if (globalThis.EdgeRuntime?.waitUntil) globalThis.EdgeRuntime.waitUntil(work()); else await work();
  return json({ ok: true, status: "accepted" });
});
