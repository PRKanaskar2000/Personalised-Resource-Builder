-- Update for: views of each post, and device / IP address / user agent of each download.
-- Run this once in Supabase: SQL Editor > New query > paste everything > Run.
-- It is safe to run again; it only adds what is missing. (schema.sql already includes it for new databases.)

-- Downloads: which device, IP address and browser each download came from
alter table downloads add column if not exists device     text;
alter table downloads add column if not exists ip         text;
alter table downloads add column if not exists user_agent text;

-- One row each time a post is shown on a fundraising page
create table if not exists views (
  id          bigint generated always as identity primary key,
  resource_id text not null references resources(id) on delete cascade,
  url         text,
  member_id   text,
  device      text,
  created_at  timestamptz not null default now()
);
create index if not exists views_resource_id_idx on views (resource_id);

-- Locked like every other table: only this app's server can read or write it
alter table views enable row level security;
