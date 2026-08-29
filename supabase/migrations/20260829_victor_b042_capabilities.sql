-- B042 Victor AI Media & Video Producer capability registry.
-- Core media analysis/planning capabilities are enabled; provider-dependent creation remains planned until live provider credentials exist.

do $$
declare
  v_id uuid;
begin
  select id into v_id from public.ai_employees where code='video_editor';
  if v_id is null then raise exception 'Victor video_editor employee missing'; end if;

  update public.ai_employees
  set job_title='AI Media & Video Producer',
      department='Media',
      status='active',
      autonomy_level='managed',
      job_assignment='Turn approved goals and real source media into professional video production plans, scripts, cut recommendations, titles, descriptions, metadata and long/mid/short-form repurposing packages; request draft media through approved providers when connected; never fabricate media or publish externally without human approval.',
      config=coalesce(config,'{}'::jsonb) || jsonb_build_object(
        'permissions',jsonb_build_array('read_video_projects','read_media_assets','generate_video_plans','prepare_metadata','prepare_repurpose_packages','request_draft_video_provider'),
        'human_approval_required',true,
        'professional_completion','blocked_until_durable_video_provider_and_creative_provider',
        'provider_policy',jsonb_build_object('legacy_sora_direct_api',false,'text_model','gpt-5.6-sol','image_model','gpt-image-2','voice_model','gpt-4o-mini-tts','video_gateway','provider_independent'),
        'learning_policy',jsonb_build_object('mode','supervised','may_self_publish',false,'use_active_lessons',true,'may_change_permissions',false)
      ),
      updated_at=now()
  where id=v_id;

  delete from public.ai_employee_capabilities where ai_employee_id=v_id;

  insert into public.ai_employee_capabilities(ai_employee_id,capability_key,capability_label,capability_description,execution_mode,requires_human_approval,status,endpoint,version)
  select v_id,x.key,x.label,x.description,x.mode,x.approval,x.status,'ai-victor-video-editor','1'
  from (values
    ('live_video_project_read','Live video project read','Read real video project records and state.','read',false,'enabled'),
    ('live_media_library_read','Live media library read','Read real media library records without inventing assets.','read',false,'enabled'),
    ('video_asset_inventory','Video asset inventory','Inventory real project assets and final media availability.','analyze',false,'enabled'),
    ('youtube_connection_awareness','YouTube connection awareness','Read YouTube connection state and report delivery blockers.','read',false,'enabled'),
    ('provider_readiness_awareness','Provider readiness awareness','Report server creative/video provider readiness without exposing secrets.','read',false,'enabled'),
    ('legacy_provider_risk_detection','Legacy provider risk detection','Detect deprecated or legacy provider dependencies and route migration blockers.','analyze',false,'enabled'),
    ('real_media_only','Real media only','Never report fabricated media, views, files or publish state as real.','analyze',false,'enabled'),
    ('source_material_provenance','Source material provenance','Tie recommendations and generated drafts to supplied source material.','analyze',false,'enabled'),
    ('approved_source_guard','Approved source guard','Fail closed when provider generation lacks approved source material.','analyze',false,'enabled'),
    ('video_readiness_review','Video readiness review','Assess script, storyboard, metadata, assets, provider and delivery readiness.','analyze',false,'enabled'),
    ('production_plan_generation','Production plan generation','Create production plans from approved project state.','generate',false,'enabled'),
    ('existing_script_analysis','Existing script analysis','Analyze stored scripts for production use.','analyze',false,'enabled'),
    ('storyboard_analysis','Storyboard analysis','Analyze stored storyboards and scene structure.','analyze',false,'enabled'),
    ('cut_recommendation_generation','Cut recommendation generation','Prepare truthful edit/cut recommendations from stored source structure.','generate',false,'enabled'),
    ('hook_review','Hook review','Review opening hook strength and clarity.','analyze',false,'enabled'),
    ('pacing_review','Pacing review','Recommend pacing improvements without fabricating timestamps.','analyze',false,'enabled'),
    ('long_form_plan','Long form plan','Prepare long-form video delivery plans.','generate',false,'enabled'),
    ('mid_form_plan','Mid form plan','Prepare mid-form video delivery plans.','generate',false,'enabled'),
    ('short_form_plan','Short form plan','Prepare short-form video delivery plans.','generate',false,'enabled'),
    ('vertical_repurpose_plan','Vertical repurpose plan','Prepare 9:16 repurposing recommendations from approved source material.','generate',false,'enabled'),
    ('clip_idea_generation','Clip idea generation','Generate clip concepts from stored script/storyboard content.','generate',false,'enabled'),
    ('title_generation','Title generation','Prepare draft titles from approved project facts.','generate',false,'enabled'),
    ('description_generation','Description generation','Prepare draft descriptions from approved project facts.','generate',false,'enabled'),
    ('tag_metadata_generation','Tag metadata generation','Prepare draft metadata/tag packages.','generate',false,'enabled'),
    ('thumbnail_brief_generation','Thumbnail brief generation','Prepare truthful thumbnail creative briefs.','generate',false,'enabled'),
    ('caption_plan_generation','Caption plan generation','Prepare caption/subtitle recommendations.','generate',false,'enabled'),
    ('cta_consistency_review','CTA consistency review','Check calls-to-action against project objectives.','analyze',false,'enabled'),
    ('platform_delivery_plan','Platform delivery plan','Prepare channel-specific delivery plans while leaving publishing protected.','generate',false,'enabled'),
    ('assignment_execution','Assignment execution','Execute tracked Avery/Owner media assignments.','write_internal',false,'enabled'),
    ('tracked_run_evidence','Tracked run evidence','Record real run evidence in AI employee history.','track',false,'enabled'),
    ('kpi_recording','KPI recording','Record evidence relevant to Victor KPI scorecards.','track',false,'enabled'),
    ('escalation_path','Escalation path','Route material media/provider/account blockers to Avery.','delegate',false,'enabled'),
    ('duplicate_escalation_suppression','Duplicate escalation suppression','Avoid creating redundant open escalation jobs.','analyze',false,'enabled'),
    ('supervised_learning','Supervised learning','Use only active approved lessons from human feedback.','read',false,'enabled'),
    ('owner_feedback_learning','Owner feedback learning','Apply approved Owner/Admin feedback lessons.','read',false,'enabled'),
    ('no_publish_boundary','No publish boundary','Victor cannot publish or schedule external media.','analyze',true,'enabled'),
    ('no_oauth_boundary','No OAuth boundary','Victor cannot connect or refresh social/video account authorization.','analyze',true,'enabled'),
    ('no_delete_boundary','No delete boundary','Victor cannot delete projects or media assets.','analyze',true,'enabled'),
    ('no_fake_media_boundary','No fake media boundary','Victor cannot fabricate final media/provider/publish evidence.','analyze',true,'enabled'),
    ('provider_script_generation','Provider script generation','Generate new scripts through configured professional creative provider.','generate',false,'planned'),
    ('provider_thumbnail_generation','Provider thumbnail generation','Generate thumbnail images through configured image provider.','generate',true,'planned'),
    ('provider_voiceover_generation','Provider voiceover generation','Generate voiceover assets through configured speech provider.','generate',true,'planned'),
    ('provider_scene_generation','Provider scene generation','Generate draft scenes through the durable video provider gateway.','generate',true,'planned'),
    ('finished_video_generation','Finished video generation','Request and ingest a finished draft video through a durable provider gateway.','generate',true,'planned'),
    ('final_asset_ingestion','Final asset ingestion','Ingest verified provider output into ALLSHIELD media storage/library.','write_internal',true,'planned')
  ) as x(key,label,description,mode,approval,status);
end $$;
