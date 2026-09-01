alter table if exists academy_instructor_preferences
  add column if not exists guided_enabled boolean not null default false,
  add column if not exists guided_voice text not null default 'marin',
  add column if not exists guided_speed numeric not null default 1.0,
  add column if not exists introduction_seen_at timestamptz;
