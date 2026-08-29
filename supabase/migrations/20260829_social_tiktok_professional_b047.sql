create table if not exists public.social_provider_approval_status (
  provider text primary key,
  app_review_status text not null default 'not_submitted' check (app_review_status in ('not_submitted','submitted','approved','rejected','changes_requested')),
  posting_audit_status text not null default 'not_submitted' check (posting_audit_status in ('not_submitted','submitted','approved','rejected','changes_requested')),
  notes text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.social_provider_approval_status enable row level security;
revoke all on table public.social_provider_approval_status from public, anon, authenticated;
grant select, insert, update, delete on table public.social_provider_approval_status to service_role;

insert into public.social_provider_approval_status(provider, app_review_status, posting_audit_status)
values ('tiktok','not_submitted','not_submitted')
on conflict (provider) do nothing;

update public.social_platform_capabilities
set organic_publish_supported = true,
    engagement_metrics_supported = true,
    comment_read_supported = false,
    comment_reply_supported = false,
    required_publish_scopes = array['user.info.basic','video.publish','video.upload']::text[],
    required_engagement_scopes = array['user.info.stats','video.list']::text[],
    required_comment_scopes = array[]::text[],
    api_notes = coalesce(api_notes,'{}'::jsonb) || jsonb_build_object(
      'community_mode','not_certified_no_general_comment_reply_api',
      'analytics_mode','user_stats_plus_public_video_metrics',
      'public_posting_requires_tiktok_audit',true,
      'unaudited_direct_posts_private_only',true
    ),
    updated_at = now()
where platform = 'tiktok';
