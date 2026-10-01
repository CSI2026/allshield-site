import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
const shuffle = <T>(items:T[]) => { const a=[...items]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const learnerRoles = new Set(["owner","agent","team_lead","manager"]);
const stateCode = (v:unknown, fallback="TX") => (String(v||fallback).trim().toUpperCase().slice(0,2) || fallback);
const focusMinutesFor = (estimated:unknown) => { const m=Number(estimated||0); if(m<=45) return 35; if(m<=75) return 45; return 60; };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const ah=req.headers.get("Authorization")||"";
    if(!ah.startsWith("Bearer ")) return json({error:"Missing authorization"},401);
    const token=ah.slice(7);
    const url=Deno.env.get("SUPABASE_URL")!;
    const pub=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}").default||Deno.env.get("SUPABASE_ANON_KEY")!;
    const sec=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const uc=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}});
    const {data:ud,error:ue}=await uc.auth.getUser(token);
    if(ue||!ud.user) return json({error:"Invalid session"},401);
    const admin=createClient(url,sec,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:profile}=await admin.from("profiles").select("id,role,status,resident_state,first_name,last_name").eq("id",ud.user.id).single();
    if(!profile||["inactive","terminated"].includes(String(profile.status))) return json({error:"Academy access unavailable"},403);
    if(!learnerRoles.has(String(profile.role))) return json({error:"This account is not assigned a learner role"},403);

    const body=await req.json();
    const action=String(body.action||"dashboard");
    const userId=profile.id;
    const primaryState=stateCode(profile.resident_state,"TX");
    const requestedState=stateCode(body.state_code,primaryState);

    async function stateCourse(state:string){
      const {data:course,error}=await admin.from("courses").select("id,title,category,state_code,version,status,effective_at").eq("state_code",state).eq("category","state_exam_prep").eq("status","published").order("version",{ascending:false}).limit(1).maybeSingle();
      if(error) throw error;
      return course;
    }

    async function ensureAssignment(state:string){
      const course=await stateCourse(state);
      if(!course) return null;
      const {data:existing,error:ee}=await admin.from("course_assignments").select("id,course_id,progress_percent,assigned_at,completed_at").eq("user_id",userId).eq("course_id",course.id).maybeSingle();
      if(ee) throw ee;
      if(existing) return {...existing,course};
      const {data:license}=await admin.from("user_state_licenses").select("id").eq("user_id",userId).eq("state_code",state).limit(1).maybeSingle();
      if(!license) return null;
      const {data:created,error:ce}=await admin.from("course_assignments").insert({user_id:userId,course_id:course.id,assigned_by:null,progress_percent:0}).select("id,course_id,progress_percent,assigned_at,completed_at").single();
      if(ce) throw ce;
      return {...created,course};
    }

    async function commercialTree(state:string){
      const assignment:any=await ensureAssignment(state);
      if(!assignment) return null;
      const course=assignment.course;
      const {data:chapters,error:chErr}=await admin.from("academy_chapters").select("id,chapter_order,code,title,description,objective_keys,estimated_minutes,quiz_question_count,pass_mark,status").eq("course_id",course.id).eq("status","published").order("chapter_order");
      if(chErr) throw chErr;
      const chapterIds=(chapters||[]).map((c:any)=>c.id);
      const {data:lessons,error:lErr}=chapterIds.length?await admin.from("academy_lessons").select("id,chapter_id,lesson_order,code,title,subtitle,estimated_minutes,minimum_active_seconds,required_check_score,status").in("chapter_id",chapterIds).eq("status","published").order("lesson_order"):{data:[],error:null};
      if(lErr) throw lErr;
      const lessonIds=(lessons||[]).map((l:any)=>l.id);
      const {data:progress,error:pErr}=lessonIds.length?await admin.from("academy_lesson_progress").select("lesson_id,status,active_seconds,check_score,check_attempts,started_at,completed_at,last_opened_at,updated_at").eq("user_id",userId).in("lesson_id",lessonIds):{data:[],error:null};
      if(pErr) throw pErr;
      const {data:attempts,error:aErr}=chapterIds.length?await admin.from("academy_chapter_attempts").select("id,chapter_id,score_percent,correct_count,question_count,passed,started_at,completed_at,metadata").eq("user_id",userId).in("chapter_id",chapterIds).not("completed_at","is",null).order("completed_at",{ascending:false}):{data:[],error:null};
      if(aErr) throw aErr;
      const {count:flashcardCount,error:fErr}=await admin.from("academy_flashcards").select("id",{count:"exact",head:true}).eq("course_id",course.id).eq("status","published");
      if(fErr) throw fErr;
      const pm=new Map((progress||[]).map((p:any)=>[String(p.lesson_id),p]));
      const latestAttempt=new Map<string,any>();
      for(const a of attempts||[]) if(!latestAttempt.has(String(a.chapter_id))) latestAttempt.set(String(a.chapter_id),a);
      let priorPassed=true,completedLessons=0,passedChapters=0;
      const tree=(chapters||[]).map((ch:any)=>{
        const chapterLessons=(lessons||[]).filter((l:any)=>String(l.chapter_id)===String(ch.id));
        let previousLessonComplete=true;
        const enriched=chapterLessons.map((l:any)=>{
          const pr:any=pm.get(String(l.id))||{status:"not_started",active_seconds:0,check_score:null,check_attempts:0,completed_at:null};
          const completed=pr.status==="completed";
          if(completed) completedLessons++;
          const unlocked=priorPassed&&previousLessonComplete;
          previousLessonComplete=completed;
          return {...l,progress:pr,completed,unlocked,focus_minutes:focusMinutesFor(l.estimated_minutes)};
        });
        const allLessonsComplete=enriched.length>0&&enriched.every((x:any)=>x.completed);
        const attempt=latestAttempt.get(String(ch.id))||null;
        const passed=!!attempt?.passed;
        if(passed) passedChapters++;
        const unlocked=priorPassed;
        const checkpointCount=enriched.length<=4?10:enriched.length<=6?15:20;
        const chapter={...ch,unlocked,all_lessons_complete:allLessonsComplete,chapter_exam_unlocked:unlocked&&allLessonsComplete,passed,latest_attempt:attempt,checkpoint_question_count:checkpointCount,lessons:enriched};
        priorPassed=passed;
        return chapter;
      });
      const totalUnits=(lessons||[]).length+(chapters||[]).length;
      const doneUnits=completedLessons+passedChapters;
      const progressPercent=totalUnits?Math.round(doneUnits/totalUnits*100):0;
      const complete=tree.length>0&&tree.every((x:any)=>x.passed);
      await admin.from("course_assignments").update({progress_percent:complete?100:progressPercent,completed_at:complete?new Date().toISOString():null}).eq("id",assignment.id);
      return {course,assignment:{...assignment,progress_percent:complete?100:progressPercent},chapters:tree,summary:{chapter_count:tree.length,lesson_count:(lessons||[]).length,completed_lessons:completedLessons,passed_chapters:passedChapters,progress_percent:complete?100:progressPercent,complete,flashcard_count:flashcardCount||0,content_ready:tree.length>0&&(lessons||[]).length>0}};
    }

    async function syncOnboarding(tree:any){
      const now=new Date().toISOString();
      const {data:licenses,error}=await admin.from("user_state_licenses").select("state_code,status,license_number,readiness_percent,metadata").eq("user_id",userId);
      if(error) throw error;
      const resident=(licenses||[]).find((x:any)=>stateCode(x.state_code)===primaryState)||(licenses||[])[0];
      const profileComplete=!!profile.first_name&&!!profile.last_name&&!!profile.resident_state;
      const licenseStatus=String(resident?.status||"").toLowerCase();
      const licenseComplete=!!resident?.license_number&&!["studying","expired","inactive","terminated"].includes(licenseStatus);
      const trainingComplete=!!tree?.summary?.complete;
      const examReady=!!resident?.metadata?.exam_ready;
      const rows=[
        {user_id:userId,step_key:"profile",step_order:1,completed:profileComplete,completed_at:profileComplete?now:null,metadata:{source:"academy_guided_v3"}},
        {user_id:userId,step_key:"training",step_order:2,completed:trainingComplete,completed_at:trainingComplete?now:null,metadata:{source:"academy_guided_v3"}},
        {user_id:userId,step_key:"test",step_order:3,completed:examReady,completed_at:examReady?now:null,metadata:{source:"academy_guided_v3"}},
        {user_id:userId,step_key:"license",step_order:4,completed:licenseComplete,completed_at:licenseComplete?now:null,metadata:{source:"academy_guided_v3"}}
      ];
      for(const row of rows){const {error:e}=await admin.from("onboarding_progress").upsert(row,{onConflict:"user_id,step_key"});if(e) throw e;}
      return {profile_complete:profileComplete,training_complete:trainingComplete,test_complete:examReady,license_complete:licenseComplete};
    }

    async function courseStateSummaries(licenses:any[]){
      return await Promise.all((licenses||[]).map(async (lic:any)=>{
        const state=stateCode(lic.state_code);
        const course=await stateCourse(state);
        let chapterCount=0,lessonCount=0;
        if(course){
          const {data:chs}=await admin.from("academy_chapters").select("id").eq("course_id",course.id).eq("status","published");
          chapterCount=(chs||[]).length;
          const ids=(chs||[]).map((x:any)=>x.id);
          if(ids.length){const {count}=await admin.from("academy_lessons").select("id",{count:"exact",head:true}).in("chapter_id",ids).eq("status","published");lessonCount=count||0;}
        }
        return {state_code:state,status:lic.status,is_resident:!!lic.is_resident,license_type:lic.license_type,course_id:course?.id||null,course_title:course?.title||null,content_ready:chapterCount>0&&lessonCount>0,chapter_count:chapterCount,lesson_count:lessonCount};
      }));
    }

    async function assertAssignedLesson(lessonId:string){
      const {data:lesson,error}=await admin.from("academy_lessons").select("id,chapter_id,lesson_order,code,title,subtitle,content,estimated_minutes,minimum_active_seconds,required_check_score,source_refs,status").eq("id",lessonId).eq("status","published").single();
      if(error||!lesson) throw new Error("Lesson not found");
      const {data:ch,error:ce}=await admin.from("academy_chapters").select("id,course_id,chapter_order,code,title,pass_mark").eq("id",lesson.chapter_id).single();
      if(ce||!ch) throw new Error("Lesson chapter not found");
      const {data:course,error:coErr}=await admin.from("courses").select("id,state_code,title,status").eq("id",ch.course_id).eq("status","published").single();
      if(coErr||!course) throw new Error("Lesson course is unavailable");
      const {data:assignment}=await admin.from("course_assignments").select("id,course_id").eq("user_id",userId).eq("course_id",course.id).maybeSingle();
      if(!assignment) throw new Error("This state course is not assigned to your account.");
      const tree:any=await commercialTree(stateCode(course.state_code));
      const treeCh=tree?.chapters?.find((x:any)=>String(x.id)===String(ch.id));
      const treeLesson=treeCh?.lessons?.find((x:any)=>String(x.id)===String(lessonId));
      if(!treeLesson?.unlocked) throw new Error("Finish the required prior lesson or chapter checkpoint before opening this lesson.");
      return {assignment,course,lesson:{...lesson,chapter:ch},tree,treeLesson};
    }

    async function assertAssignedChapter(chapterId:string){
      const {data:ch,error}=await admin.from("academy_chapters").select("id,course_id,chapter_order,code,title,pass_mark").eq("id",chapterId).eq("status","published").single();
      if(error||!ch) throw new Error("Chapter not found");
      const {data:course,error:coErr}=await admin.from("courses").select("id,state_code,title,status").eq("id",ch.course_id).eq("status","published").single();
      if(coErr||!course) throw new Error("Chapter course is unavailable");
      const {data:assignment}=await admin.from("course_assignments").select("id,course_id").eq("user_id",userId).eq("course_id",course.id).maybeSingle();
      if(!assignment) throw new Error("This state course is not assigned to your account.");
      const tree:any=await commercialTree(stateCode(course.state_code));
      const treeCh=tree?.chapters?.find((x:any)=>String(x.id)===String(ch.id));
      if(!treeCh) throw new Error("Chapter is not part of your assigned course");
      return {assignment,course,chapter:treeCh,tree};
    }

    if(action==="dashboard"){
      const tree=await commercialTree(requestedState);
      const primaryTree=requestedState===primaryState?tree:await commercialTree(primaryState);
      const sync=await syncOnboarding(primaryTree);
      const [ob,lic,ex]=await Promise.all([
        admin.from("onboarding_progress").select("step_key,step_order,completed,completed_at,metadata").eq("user_id",userId).order("step_order"),
        admin.from("user_state_licenses").select("state_code,license_type,is_resident,status,readiness_percent,license_number,expiration_date,metadata").eq("user_id",userId).order("state_code"),
        admin.from("exam_attempts").select("id,exam_type,state_code,score_percent,question_count,correct_count,created_at,attempt_payload").eq("user_id",userId).order("created_at",{ascending:false}).limit(20)
      ]);
      if(ob.error||lic.error||ex.error) return json({error:(ob.error||lic.error||ex.error)?.message},400);
      const tracks=await courseStateSummaries(lic.data||[]);
      return json({ok:true,profile,onboarding:ob.data||[],licenses:lic.data||[],state_tracks:tracks,active_state:requestedState,commercial_course:tree,exams:ex.data||[],sync});
    }

    if(action==="open_lesson"){
      const lessonId=String(body.lesson_id||"");if(!lessonId)return json({error:"Missing lesson id"},400);
      const x:any=await assertAssignedLesson(lessonId);
      const {data:pr}=await admin.from("academy_lesson_progress").select("*").eq("user_id",userId).eq("lesson_id",lessonId).maybeSingle();
      const now=new Date().toISOString();
      if(!pr) await admin.from("academy_lesson_progress").insert({user_id:userId,lesson_id:lessonId,status:"in_progress",active_seconds:0,started_at:now,last_opened_at:now,updated_at:now});
      else if(pr.status!=="completed") await admin.from("academy_lesson_progress").update({status:"in_progress",last_opened_at:now,updated_at:now}).eq("id",pr.id);
      const {data:checks,error:ce}=await admin.from("academy_knowledge_checks").select("id,check_order,prompt,answers,objective_key").eq("lesson_id",lessonId).eq("status","published").order("check_order");
      if(ce)return json({error:ce.message},400);
      const selected=shuffle(checks||[]).slice(0,Math.min(6,(checks||[]).length));
      const objectives=Array.isArray(x.lesson.content?.learning_objectives)?x.lesson.content.learning_objectives.slice(0,3):[];
      const script=`In this lesson, focus on ${objectives.length?objectives.join(", "):x.lesson.title}. Stay focused, learn the why, then prove it on the check. ALLSHIELD all the way.`;
      const focusMinutes=focusMinutesFor(x.lesson.estimated_minutes);
      return json({ok:true,state_code:stateCode(x.course.state_code),lesson:x.lesson,progress:pr||{status:"in_progress",active_seconds:0,check_score:null,check_attempts:0},knowledge_checks:selected,intro:{duration_seconds:15,title:x.lesson.title,objectives,script,video_url:x.lesson.content?.intro_video_url||null},completion_rule:{minimum_active_seconds:0,required_check_score:x.lesson.required_check_score,focus_minutes:focusMinutes}});
    }

    if(action==="record_activity"){
      const lessonId=String(body.lesson_id||"");const seconds=Math.max(1,Math.min(60,Math.round(Number(body.seconds||0))));
      if(!lessonId||!Number.isFinite(seconds))return json({error:"Invalid activity update"},400);
      await assertAssignedLesson(lessonId);
      const {data:pr}=await admin.from("academy_lesson_progress").select("id,status,active_seconds,started_at").eq("user_id",userId).eq("lesson_id",lessonId).maybeSingle();
      const now=new Date().toISOString();
      if(pr?.status==="completed")return json({ok:true,status:"completed",active_seconds:Number(pr.active_seconds||0)});
      const next=Math.min(86400,Number(pr?.active_seconds||0)+seconds);
      if(pr){const {error}=await admin.from("academy_lesson_progress").update({status:"in_progress",active_seconds:next,last_opened_at:now,updated_at:now}).eq("id",pr.id);if(error)return json({error:error.message},400);}
      else{const {error}=await admin.from("academy_lesson_progress").insert({user_id:userId,lesson_id:lessonId,status:"in_progress",active_seconds:next,started_at:now,last_opened_at:now,updated_at:now});if(error)return json({error:error.message},400);}
      return json({ok:true,status:"in_progress",active_seconds:next});
    }

    if(action==="submit_lesson_check"){
      const lessonId=String(body.lesson_id||"");const responses=Array.isArray(body.responses)?body.responses:[];
      if(!lessonId)return json({error:"Missing lesson id"},400);
      const x:any=await assertAssignedLesson(lessonId);
      const ids=[...new Set(responses.map((r:any)=>String(r.id||"")).filter(Boolean))];
      const {count:availableCount,error:countErr}=await admin.from("academy_knowledge_checks").select("id",{count:"exact",head:true}).eq("lesson_id",lessonId).eq("status","published");
      if(countErr)return json({error:countErr.message},400);
      const requiredCount=Math.min(6,Number(availableCount||0));
      if(!requiredCount)return json({error:"This lesson does not yet have a validated knowledge check."},409);
      if(ids.length!==requiredCount||responses.length!==requiredCount)return json({error:`Complete all ${requiredCount} questions in this lesson check before submitting.`},400);
      const {data:checks,error:ce}=await admin.from("academy_knowledge_checks").select("id,check_order,prompt,answers,correct_answer_key,explanation").eq("lesson_id",lessonId).eq("status","published").in("id",ids);
      if(ce)return json({error:ce.message},400);
      if((checks||[]).length!==requiredCount)return json({error:"One or more submitted questions are not valid for this lesson."},400);
      const map=new Map(responses.map((r:any)=>[String(r.id),String(r.answer||"")]));
      if((checks||[]).some((q:any)=>!map.get(String(q.id))))return json({error:"Answer every knowledge-check question before submitting."},400);
      let correct=0;
      const review=(checks||[]).map((q:any)=>{const selected=map.get(String(q.id))||"";const good=selected===String(q.correct_answer_key);if(good)correct++;return{id:q.id,prompt:q.prompt,selected_key:selected,correct:good,correct_answer_key:q.correct_answer_key,correct_answer:q.answers?.[q.correct_answer_key]||null,explanation:q.explanation};});
      const score=Number((correct/(checks||[]).length*100).toFixed(1));
      const {data:pr}=await admin.from("academy_lesson_progress").select("id,active_seconds,check_attempts,status,started_at").eq("user_id",userId).eq("lesson_id",lessonId).maybeSingle();
      const focusMinutes=focusMinutesFor(x.lesson.estimated_minutes);
      const requiredSeconds=0;
      const activeSeconds=Number(pr?.active_seconds||0),enoughTime=true,passedCheck=score>=Number(x.lesson.required_check_score||80),completed=passedCheck,now=new Date().toISOString();
      const row={user_id:userId,lesson_id:lessonId,status:completed?"completed":"in_progress",active_seconds:activeSeconds,check_score:score,check_attempts:Number(pr?.check_attempts||0)+1,started_at:pr?.started_at||now,completed_at:completed?now:null,last_opened_at:now,updated_at:now};
      const {error:pe}=await admin.from("academy_lesson_progress").upsert(row,{onConflict:"user_id,lesson_id"});if(pe)return json({error:pe.message},400);
      const tree=await commercialTree(stateCode(x.course.state_code));
      return json({ok:true,score_percent:score,correct_count:correct,question_count:(checks||[]).length,required_score:Number(x.lesson.required_check_score||80),active_seconds:activeSeconds,minimum_active_seconds:requiredSeconds,focus_minutes:focusMinutes,enough_time:enoughTime,passed_check:passedCheck,completed,review,course_progress_percent:tree?.summary?.progress_percent||0});
    }

    if(action==="start_chapter_exam"){
      const chapterId=String(body.chapter_id||"");if(!chapterId)return json({error:"Missing chapter id"},400);
      const x:any=await assertAssignedChapter(chapterId);const ch=x.chapter;
      if(!ch.chapter_exam_unlocked)return json({error:"Complete every lesson in this chapter before taking its checkpoint."},409);
      const lessonIds=ch.lessons.map((z:any)=>z.id);
      const {data:pool,error}=await admin.from("academy_knowledge_checks").select("id,lesson_id,prompt,answers,objective_key").in("lesson_id",lessonIds).eq("status","published");
      if(error)return json({error:error.message},400);if(!(pool||[]).length)return json({error:"No chapter checkpoint questions are available."},409);
      const target=ch.lessons.length<=4?10:ch.lessons.length<=6?15:20;
      const count=Math.min(target,(pool||[]).length),selected=shuffle(pool||[]).slice(0,count);
      const {data:attempt,error:ae}=await admin.from("academy_chapter_attempts").insert({user_id:userId,chapter_id:chapterId,question_ids:selected.map((q:any)=>q.id),question_count:selected.length,metadata:{engine_version:3,pass_mark:Number(ch.pass_mark||80),checkpoint:true,state_code:stateCode(x.course.state_code)}}).select("id,started_at").single();
      if(ae)return json({error:ae.message},400);
      return json({ok:true,state_code:stateCode(x.course.state_code),attempt_id:attempt.id,chapter:{id:ch.id,title:ch.title,pass_mark:Number(ch.pass_mark||80)},question_count:selected.length,questions:selected.map((q:any)=>({id:q.id,prompt:q.prompt,answers:q.answers,objective_key:q.objective_key}))});
    }

    if(action==="submit_chapter_exam"){
      const attemptId=String(body.attempt_id||"");const responses=Array.isArray(body.responses)?body.responses:[];if(!attemptId)return json({error:"Missing attempt id"},400);
      const {data:attempt,error:ae}=await admin.from("academy_chapter_attempts").select("*").eq("id",attemptId).eq("user_id",userId).single();if(ae||!attempt)return json({error:"Chapter attempt not found"},404);if(attempt.completed_at)return json({error:"This chapter checkpoint is already completed"},409);
      const ids=(attempt.question_ids||[]).map(String),rm=new Map(responses.map((r:any)=>[String(r.id),String(r.answer||"")]));if(ids.some((id:string)=>!rm.has(id)))return json({error:"Answer every chapter-checkpoint question before submitting."},400);
      const {data:qs,error:qe}=await admin.from("academy_knowledge_checks").select("id,prompt,answers,correct_answer_key,explanation").in("id",ids);if(qe)return json({error:qe.message},400);const qm=new Map((qs||[]).map((q:any)=>[String(q.id),q]));
      let correct=0;const review=ids.map((id:string)=>{const q:any=qm.get(id);const selected=rm.get(id)||"";const good=!!q&&selected===String(q.correct_answer_key);if(good)correct++;return{id,prompt:q?.prompt||"",selected_key:selected,correct:good,correct_answer_key:q?.correct_answer_key||null,correct_answer:q?.answers?.[q?.correct_answer_key]||null,explanation:q?.explanation||null};});
      const count=ids.length,score=Number((correct/count*100).toFixed(1)),passMark=Number(attempt.metadata?.pass_mark||80),passed=score>=passMark,now=new Date().toISOString();
      const {error:ue2}=await admin.from("academy_chapter_attempts").update({responses,score_percent:score,correct_count:correct,question_count:count,passed,completed_at:now,metadata:{...(attempt.metadata||{}),reviewed:true}}).eq("id",attemptId);if(ue2)return json({error:ue2.message},400);
      const {data:ch}=await admin.from("academy_chapters").select("course_id").eq("id",attempt.chapter_id).single();
      const {data:course}=ch?await admin.from("courses").select("state_code").eq("id",ch.course_id).single():{data:null};
      const tree=course?await commercialTree(stateCode(course.state_code)):null;
      const primaryTree=course&&stateCode(course.state_code)===primaryState?tree:await commercialTree(primaryState);
      await syncOnboarding(primaryTree);
      return json({ok:true,score_percent:score,correct_count:correct,question_count:count,pass_mark:passMark,passed,review,course_progress_percent:tree?.summary?.progress_percent||0,next_chapter_unlocked:passed});
    }

    if(action==="flashcards"){
      const state=stateCode(body.state_code,primaryState);const assignment:any=await ensureAssignment(state);if(!assignment)return json({error:"No assigned course for that state"},404);
      let q=admin.from("academy_flashcards").select("id,chapter_id,term,definition,exam_tip,tags").eq("course_id",assignment.course_id).eq("status","published");
      if(body.chapter_id)q=q.eq("chapter_id",String(body.chapter_id));
      const {data:cards,error}=await q.order("created_at");if(error)return json({error:error.message},400);return json({ok:true,state_code:state,cards:shuffle(cards||[])});
    }

    if(action==="sync_readiness"){
      const tree=await commercialTree(primaryState);const sync=await syncOnboarding(tree);return json({ok:true,...sync,course_progress_percent:tree?.summary?.progress_percent||0});
    }
    if(action==="set_module_complete")return json({error:"Manual completion is disabled for the guided licensing course. Complete the lesson focus session and pass the required checks instead."},409);
    return json({error:"Unknown action"},400);
  }catch(e){return json({error:e instanceof Error?e.message:String(e)},500);}
});
