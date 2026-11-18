-- ============================================================
-- School Dashboard — Supabase setup
-- Run this whole file once in Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Tables ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Principal Sarah',
  role_title text not null default 'Head of Administration',
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_teachers integer not null default 84,
  pending_fees text not null default '$12.5k',
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  grade text not null default '',
  attendance integer not null default 100 check (attendance between 0 and 100),
  status text not null default 'Good',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
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
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'Notice',
  title text not null,
  time text not null default '',
  accent text not null default 'cyan',
  icon text not null default 'FileText',
  created_at timestamptz not null default now()
);

create index if not exists students_user_id_idx on public.students(user_id);
create index if not exists schedule_items_user_id_idx on public.schedule_items(user_id);
create index if not exists messages_user_id_idx on public.messages(user_id);
create index if not exists events_user_id_idx on public.events(user_id);

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.students enable row level security;
alter table public.schedule_items enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;

-- Policies for tables keyed by user_id
do $$
declare
  t text;
begin
  foreach t in array array['students', 'schedule_items', 'messages', 'events'] loop
    execute format('drop policy if exists "own_select" on public.%I', t);
    execute format('create policy "own_select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('drop policy if exists "own_insert" on public.%I', t);
    execute format('create policy "own_insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('drop policy if exists "own_update" on public.%I', t);
    execute format('create policy "own_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('drop policy if exists "own_delete" on public.%I', t);
    execute format('create policy "own_delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Policies for profile (keyed by id)
drop policy if exists "own_profile_select" on public.profiles;
create policy "own_profile_select" on public.profiles for select using (auth.uid() = id);
drop policy if exists "own_profile_insert" on public.profiles;
create policy "own_profile_insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "own_profile_update" on public.profiles;
create policy "own_profile_update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own_profile_delete" on public.profiles;
create policy "own_profile_delete" on public.profiles for delete using (auth.uid() = id);

-- Policies for settings (keyed by user_id)
drop policy if exists "own_settings_select" on public.settings;
create policy "own_settings_select" on public.settings for select using (auth.uid() = user_id);
drop policy if exists "own_settings_insert" on public.settings;
create policy "own_settings_insert" on public.settings for insert with check (auth.uid() = user_id);
drop policy if exists "own_settings_update" on public.settings;
create policy "own_settings_update" on public.settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own_settings_delete" on public.settings;
create policy "own_settings_delete" on public.settings for delete using (auth.uid() = user_id);

-- ---------- Auto-create profile + settings for new sign-ups ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role_title)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Principal Sarah'),
    'Head of Administration'
  )
  on conflict (id) do nothing;

  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Optional: sample data for the currently signed-in user.
-- Uncomment and run AFTER signing up in the app.
-- ============================================================

-- insert into public.students (user_id, name, grade, attendance, status) values
--   (auth.uid(), 'Alex Carter', 'Grade 10-A', 98, 'Excellent'),
--   (auth.uid(), 'Bella Thorne', 'Grade 9-B', 85, 'Warning'),
--   (auth.uid(), 'Cameron Diaz', 'Grade 11-Sci', 100, 'Perfect');
--
-- insert into public.events (user_id, type, title, time, accent, icon) values
--   (auth.uid(), 'Exam', 'Mid-Term Mathematics', 'Tomorrow, 09:00 AM', 'purple', 'FileText'),
--   (auth.uid(), 'Notice', 'Staff Meeting (All Depts)', 'Today, 02:30 PM', 'cyan', 'Users');
