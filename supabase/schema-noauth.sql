-- ============================================================
-- School Dashboard — Supabase tables (NO LOGIN REQUIRED)
-- Run once: Supabase → SQL Editor → New query → paste all → Run
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null default 'Principal Sarah',
  role_title text not null default 'Head of Administration',
  avatar_url text default 'https://i.pravatar.cc/150?img=47',
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  total_teachers integer not null default 84,
  pending_fees text not null default '$12.5k',
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text not null default '',
  attendance integer not null default 100 check (attendance between 0 and 100),
  status text not null default 'Good',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  day text not null default 'Today',
  time text not null default '',
  subject text not null,
  teacher text not null default '',
  room text not null default '',
  color text not null default 'cyan',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  msg text not null default '',
  time text not null default '',
  unread integer not null default 0,
  is_group boolean not null default false,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'Notice',
  title text not null,
  time text not null default '',
  accent text not null default 'cyan',
  icon text not null default 'FileText',
  created_at timestamptz not null default now()
);

-- One fixed row for the profile and overview settings.
insert into public.profiles (id, avatar_url)
values ('00000000-0000-0000-0000-000000000001', 'https://i.pravatar.cc/150?img=47')
on conflict (id) do update set avatar_url = excluded.avatar_url;

insert into public.settings (id) values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- Public read/write (no login).
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.students enable row level security;
alter table public.schedule_items enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;

drop policy if exists "public_access" on public.profiles;
create policy "public_access" on public.profiles for all using (true) with check (true);
drop policy if exists "public_access" on public.settings;
create policy "public_access" on public.settings for all using (true) with check (true);
drop policy if exists "public_access" on public.students;
create policy "public_access" on public.students for all using (true) with check (true);
drop policy if exists "public_access" on public.schedule_items;
create policy "public_access" on public.schedule_items for all using (true) with check (true);
drop policy if exists "public_access" on public.messages;
create policy "public_access" on public.messages for all using (true) with check (true);
drop policy if exists "public_access" on public.events;
create policy "public_access" on public.events for all using (true) with check (true);

grant all on public.profiles to anon, authenticated;
grant all on public.settings to anon, authenticated;
grant all on public.students to anon, authenticated;
grant all on public.schedule_items to anon, authenticated;
grant all on public.messages to anon, authenticated;
grant all on public.events to anon, authenticated;

-- Done. The app will now load and save data without any login.
