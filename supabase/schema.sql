-- Personalised Resource Builder: database tables.
-- Run this once in Supabase: SQL Editor > New query > paste everything > Run.
-- It is safe to run again; it only creates what is missing.
--
-- How the data is organised:
--   client  ->  events (folders)  ->  resources, uploaded images, settings
--                                     resource -> downloads, views

-- A client: a company that logs in. Passwords are stored only as a scrambled hash.
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  username      text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- An event belongs to one client. Its settings hold the impact units and custom variables.
create table if not exists events (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id) on delete cascade,
  name       text not null,
  settings   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- A resource (a design) belongs to one event.
create table if not exists resources (
  id         text primary key,
  event_id   uuid not null references events(id) on delete cascade,
  name       text not null,
  design     jsonb not null,
  versions   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- An uploaded image belongs to one event. The file itself is kept in Supabase Storage.
create table if not exists assets (
  id         text primary key,
  event_id   uuid not null references events(id) on delete cascade,
  name       text not null,
  mime_type  text not null,
  url        text not null,
  created_at timestamptz not null default now()
);

-- One row each time someone downloads a resource: the download history.
create table if not exists downloads (
  id          bigint generated always as identity primary key,
  resource_id text not null references resources(id) on delete cascade,
  url         text not null,
  format      text not null,
  member_id   text,
  member_name text,
  device      text,   -- Mobile, Tablet or Desktop
  ip          text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- One row each time a post is shown on a fundraising page.
create table if not exists views (
  id          bigint generated always as identity primary key,
  resource_id text not null references resources(id) on delete cascade,
  url         text,
  member_id   text,
  device      text,
  created_at  timestamptz not null default now()
);

-- Make the common lookups fast
create index if not exists events_client_id_idx      on events (client_id);
create index if not exists resources_event_id_idx    on resources (event_id);
create index if not exists assets_event_id_idx       on assets (event_id);
create index if not exists downloads_resource_id_idx on downloads (resource_id);
create index if not exists views_resource_id_idx     on views (resource_id);

-- Security: lock every table. With row level security on and no policies, the public keys
-- cannot read or write anything. Only this app's server, which holds the service_role key, can.
-- The app itself then checks that a logged-in client only reaches their own events.
alter table clients   enable row level security;
alter table events    enable row level security;
alter table resources enable row level security;
alter table assets    enable row level security;
alter table downloads enable row level security;
alter table views     enable row level security;
