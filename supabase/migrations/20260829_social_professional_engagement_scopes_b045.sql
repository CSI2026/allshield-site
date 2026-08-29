alter table public.social_platform_capabilities
  add column if not exists required_engagement_scopes text[] not null default '{}'::text[];

update public.social_platform_capabilities
set required_engagement_scopes = case platform
  when 'youtube' then array['https://www.googleapis.com/auth/youtube.readonly','https://www.googleapis.com/auth/yt-analytics.readonly']::text[]
  when 'linkedin' then array['r_organization_admin','r_organization_social']::text[]
  when 'facebook' then array['pages_read_engagement']::text[]
  when 'instagram' then array['pages_read_engagement']::text[]
  else '{}'::text[]
end,
updated_at = now()
where platform in ('youtube','linkedin','facebook','instagram','tiktok','x');
