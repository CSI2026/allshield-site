import { createClient } from "npm:@supabase/supabase-js@2";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
function first(...vals: any[]) { return vals.find(v => v !== undefined && v !== null && String(v).trim() !== ""); }
function allowedHeyGenUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && ["files2.heygen.ai", "resource2.heygen.ai"].includes(u.hostname);
  } catch { return false; }
}

function tusMetadata(values: Record<string, string>) {
  return Object.entries(values).map(([key, value]) => `${key} ${btoa(value)}`).join(",");
}

async function uploadLargeVideo(bytes: Uint8Array, supabaseUrl: string, authToken: string, apiKey: string, path: string) {
  const projectId = new URL(supabaseUrl).hostname.split(".")[0];
  const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
  const commonHeaders = {
    Authorization: `Bearer ${authToken}`,
    apikey: apiKey,
    "Tus-Resumable": "1.0.0",
    "x-upsert": "true"
  };
  const created = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...commonHeaders,
      "Upload-Length": String(bytes.byteLength),
      "Upload-Metadata": tusMetadata({
        bucketName: "academy-media",
        objectName: path,
        contentType: "video/mp4",
        cacheControl: "31536000"
      })
    }
  });
  if (!created.ok) throw new Error(`Resumable upload creation failed ${created.status}: ${await created.text()}`);
  const location = created.headers.get("location");
  if (!location) throw new Error("Resumable upload did not return a location");
  const uploadUrl = new URL(location, endpoint).toString();
  const chunkSize = 6 * 1024 * 1024;
  let offset = 0;
  while (offset < bytes.byteLength) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.byteLength));
    const response = await fetch(uploadUrl, {
      method: "PATCH",
      headers: {
        ...commonHeaders,
        "Content-Type": "application/offset+octet-stream",
        "Upload-Offset": String(offset)
      },
      body: chunk
    });
    if (!response.ok) throw new Error(`Resumable upload chunk failed ${response.status}: ${await response.text()}`);
    offset = Number(response.headers.get("upload-offset") || offset + chunk.byteLength);
  }
  return uploadUrl;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST required" }, 405);
  const directUpload = (req.headers.get("content-type") || "").includes("application/octet-stream");
  let body: any = {};
  let directBytes: Uint8Array | null = null;
  if (directUpload) {
    directBytes = new Uint8Array(await req.arrayBuffer());
    if (!directBytes.byteLength) return json({ error: "empty upload" }, 400);
  } else {
    try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  }
  const data = body?.event_data || body?.data || body || {};
  const callbackId = String(first(req.headers.get("x-callback-id"), data.callback_id, data.callbackId, body.callback_id, body.callbackId) || "").trim();
  if (!callbackId || callbackId.length < 24) return json({ error: "invalid callback" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const storageAuthToken = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || serviceKey;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: job } = await admin.from("academy_instructor_video_jobs").select("id,lesson_id,lesson_code,part,part_title,callback_id,heygen_job_id").eq("callback_id", callbackId).maybeSingle();
  if (!job) return json({ error: "unknown callback" }, 401);

  const eventType = String(body?.event_type || body?.event || "").toLowerCase();
  const explicitStatus = String(first(data.status, body.status) || "").toLowerCase();
  const failed = eventType.includes("fail") || ["failed", "error"].includes(explicitStatus);
  const videoUrl = String(first(data.video_url, data.url, data.videoUrl, body.video_url, body.url, body.videoUrl) || "").trim();
  const captionUrl = String(first(data.caption_url, data.subtitle_url, data.captionUrl, data.subtitleUrl) || "").trim();
  const incomingJobId = String(first(req.headers.get("x-provider-job-id"), data.video_id, data.videoId, data.lipsync_id, data.lipsyncId, body.video_id, body.videoId, body.lipsync_id, body.lipsyncId) || "").trim();
  const failureMessage = String(first(data.failure_message, data.error, data.message, body.failure_message, body.error, body.message) || "").trim();
  const duration = Number(first(req.headers.get("x-duration-seconds"), data.duration, data.duration_seconds, body.duration, body.duration_seconds) || 0) || null;

  if (incomingJobId && job.heygen_job_id && incomingJobId !== job.heygen_job_id) return json({ error: "job mismatch" }, 401);
  if (videoUrl && !allowedHeyGenUrl(videoUrl)) return json({ error: "invalid media host" }, 400);

  await admin.from("academy_instructor_video_jobs").update({
    status: failed ? "failed" : ((videoUrl || directBytes) ? "rendered" : (explicitStatus || "callback_received")),
    heygen_video_url: videoUrl || null,
    caption_url: captionUrl || null,
    failure_message: failureMessage || null,
    raw_callback: body,
    updated_at: new Date().toISOString()
  }).eq("id", job.id);

  await admin.from("academy_instructor_segments").update({
    provider: "heygen",
    provider_job_id: incomingJobId || job.heygen_job_id || null,
    status: failed ? "failed" : ((videoUrl || directBytes) ? "rendered" : "rendering"),
    duration_seconds: duration,
    metadata: { callback_id: callbackId, caption_url: captionUrl || null, failure_message: failureMessage || null },
    updated_at: new Date().toISOString()
  }).eq("lesson_id", job.lesson_id).eq("segment_order", Number(job.part));

  if (failed || (!videoUrl && !directBytes)) return json({ ok: true, status: failed ? "failed" : "received" });

  const work = async () => {
    try {
      let bytes = directBytes;
      if (!bytes) {
        const media = await fetch(videoUrl);
        if (!media.ok) throw new Error(`HeyGen download failed ${media.status}`);
        bytes = new Uint8Array(await media.arrayBuffer());
      }
      const suffix = Number(job.part) > 1 ? `-part-${job.part}` : "";
      const path = `courses/tx/ava/${job.lesson_code}${suffix}.mp4`;
      if (bytes.byteLength <= 45 * 1024 * 1024) {
        const { error: uploadErr } = await admin.storage.from("academy-media").upload(path, bytes, { contentType: "video/mp4", cacheControl: "31536000", upsert: true });
        if (uploadErr) throw uploadErr;
      } else {
        await uploadLargeVideo(bytes, supabaseUrl, storageAuthToken, serviceKey, path);
      }
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
