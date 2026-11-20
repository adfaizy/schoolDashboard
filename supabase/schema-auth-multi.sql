-- ============================================================
-- School Dashboard — AUTH FIRST / MULTI-SCHOOL SCHEMA
-- Run ONCE in Supabase → SQL Editor → New query → Run.
-- WARNING: this DROPS all existing school data tables (already cleared)
-- and recreates them so every row belongs to one signed-in school account.
-- An admin account can view and manage every school.
-- ============================================================

create extension if not exists pgcrypto;

-- Bootstrap admin email. The first account created with this email becomes admin.
-- Change it before running if you want a different admin address.
-- You can also promote any account later with:
--   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');

-- ---------------------------------------------------------------- drop old
drop table if exists public.hostel_assignments cascade;
drop table if exists public.hostel_rooms cascade;
drop table if exists public.transport_passengers cascade;
drop table if exists public.transport_routes cascade;
drop table if exists public.library_books cascade;
drop table if exists public.fees cascade;
drop table if exists public.exam_marks cascade;
drop table if exists public.attendance cascade;
drop table if exists public.schedule_items cascade;
drop table if exists public.messages cascade;
drop table if exists public.events cascade;
drop table if exists public.staff cascade;
drop table if exists public.classes cascade;
drop table if exists public.students cascade;
drop table if exists public.settings cascade;
drop table if exists public.profiles cascade;

drop function if exists public.is_admin();
drop function if exists public.handle_new_user();
drop function if exists public.prevent_role_escalation();

-- ---------------------------------------------------------------- tables
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Principal',
  role_title text not null default 'Head of Administration',
  role text not null default 'school' check (role in ('school', 'admin')),
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  school_name text,
  total_teachers integer not null default 0,
  pending_fees text not null default 'Rs 0',
  status text not null default 'active',
  updated_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grade text not null,
  section text not null default '',
  subjects jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, grade, section)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  grade text not null default '',
  attendance integer not null default 0 check (attendance between 0 and 100),
  status text not null default 'No records',
  avatar_url text,
  class_id uuid references public.classes(id) on delete set null,
  roll_no text,
  father_name text,
  parent_contact text,
  admission_date date default current_date,
  created_at timestamptz not null default now()
);

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day text not null default 'Today',
  time text not null default '',
  subject text not null,
  teacher text not null default '',
  room text not null default '',
  color text not null default 'cyan',
  class_id uuid references public.classes(id) on delete set null,
  period_no integer,
  created_at timestamptz not null default now(),
  unique (user_id, class_id, period_no)
);

create table public.messages (
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

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'Notice',
  title text not null,
  time text not null default '',
  accent text not null default 'cyan',
  icon text not null default 'FileText',
  created_at timestamptz not null default now()
);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  designation text not null default '',
  staff_category text not null default 'teaching' check (staff_category in ('teaching', 'non-teaching')),
  status text not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.attendance (
  user_id uuid not null references auth.users(id) on delete cascade,
  date_str text not null,
  entity_type text not null check (entity_type in ('students', 'staff')),
  record_id uuid not null,
  status text not null check (status in ('present', 'absent', 'late', 'leave')),
  updated_at timestamptz not null default now(),
  primary key (date_str, entity_type, record_id)
);

create table public.exam_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session text not null default '2026-2027',
  term text not null default 'Term 1',
  student_id uuid references public.students(id) on delete cascade,
  subject text not null,
  marks_obtained numeric not null default 0,
  total_marks numeric not null default 100,
  created_at timestamptz not null default now(),
  unique (session, term, student_id, subject)
);

create table public.fees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  month_year text not null,
  amount_paid numeric not null default 0,
  payment_date date default current_date,
  status text not null default 'paid',
  created_at timestamptz not null default now(),
  unique (student_id, month_year)
);

create table public.library_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text not null default '',
  isbn text not null default '',
  status text not null default 'available' check (status in ('available', 'issued')),
  issued_to uuid references public.students(id) on delete set null,
  issue_date date,
  created_at timestamptz not null default now()
);

create table public.transport_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_name text not null,
  driver text not null default '',
  vehicle_no text not null default '',
  created_at timestamptz not null default now()
);

create table public.transport_passengers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id uuid references public.transport_routes(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  unique (route_id, student_id)
);

create table public.hostel_rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_no text not null,
  capacity integer not null default 1 check (capacity > 0),
  created_at timestamptz not null default now()
);

create table public.hostel_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_id uuid references public.hostel_rooms(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  unique (room_id, student_id)
);

create index if not exists idx_students_user on public.students(user_id);
create index if not exists idx_schedule_user on public.schedule_items(user_id);
create index if not exists idx_messages_user on public.messages(user_id);
create index if not exists idx_events_user on public.events(user_id);
create index if not exists idx_classes_user on public.classes(user_id);
create index if not exists idx_staff_user on public.staff(user_id);
create index if not exists idx_attendance_user on public.attendance(user_id);
create index if not exists idx_exam_marks_user on public.exam_marks(user_id);
create index if not exists idx_fees_user on public.fees(user_id);
create index if not exists idx_books_user on public.library_books(user_id);
create index if not exists idx_routes_user on public.transport_routes(user_id);
create index if not exists idx_passengers_user on public.transport_passengers(user_id);
create index if not exists idx_rooms_user on public.hostel_rooms(user_id);
create index if not exists idx_assignments_user on public.hostel_assignments(user_id);

-- ---------------------------------------------------------------- helpers
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------- RLS
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'students','schedule_items','messages','events','classes','staff','attendance',
    'exam_marks','fees','library_books','transport_routes','transport_passengers',
    'hostel_rooms','hostel_assignments'
  ]) loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public_access" on public.%I', t);
    execute format('drop policy if exists "own_select" on public.%I', t);
    execute format('drop policy if exists "own_insert" on public.%I', t);
    execute format('drop policy if exists "own_update" on public.%I', t);
    execute format('drop policy if exists "own_delete" on public.%I', t);
    execute format('create policy "own_select" on public.%I for select using (user_id = auth.uid() or public.is_admin())', t);
    execute format('create policy "own_insert" on public.%I for insert with check (user_id = auth.uid() or public.is_admin())', t);
    execute format('create policy "own_update" on public.%I for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin())', t);
    execute format('create policy "own_delete" on public.%I for delete using (user_id = auth.uid() or public.is_admin())', t);
  end loop;
end $$;

-- profiles
alter table public.profiles enable row level security;
drop policy if exists "public_access" on public.profiles;
drop policy if exists "own_profile_select" on public.profiles;
drop policy if exists "own_profile_insert" on public.profiles;
drop policy if exists "own_profile_update" on public.profiles;
drop policy if exists "own_profile_delete" on public.profiles;
create policy "own_profile_select" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "own_profile_insert" on public.profiles for insert with check (id = auth.uid());
create policy "own_profile_update" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "own_profile_delete" on public.profiles for delete using (public.is_admin());

-- settings
alter table public.settings enable row level security;
drop policy if exists "public_access" on public.settings;
drop policy if exists "own_settings_select" on public.settings;
drop policy if exists "own_settings_insert" on public.settings;
drop policy if exists "own_settings_update" on public.settings;
drop policy if exists "own_settings_delete" on public.settings;
create policy "own_settings_select" on public.settings for select using (user_id = auth.uid() or public.is_admin());
create policy "own_settings_insert" on public.settings for insert with check (user_id = auth.uid() or public.is_admin());
create policy "own_settings_update" on public.settings for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "own_settings_delete" on public.settings for delete using (user_id = auth.uid() or public.is_admin());

-- only signed-in users may touch data
revoke all on public.profiles from anon;
revoke all on public.settings from anon;
do $$
declare t text;
begin
  for t in select unnest(array[
    'students','schedule_items','messages','events','classes','staff','attendance',
    'exam_marks','fees','library_books','transport_routes','transport_passengers',
    'hostel_rooms','hostel_assignments'
  ]) loop
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.settings to authenticated;

-- Prevent a school account from making itself admin by editing its profile.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_escalation on public.profiles;
create trigger prevent_role_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_role_escalation();

-- ---------------------------------------------------------------- new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role_title, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    'Head of Administration',
    case when lower(coalesce(new.email, '')) = 'admin@school.com' then 'admin' else 'school' end
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

-- If an admin account already existed before this migration, promote it.
update public.profiles
set role = 'admin'
where id in (select id from auth.users where lower(email) = 'admin@school.com');

-- Done. New accounts start with empty data. School accounts see only their own rows;
-- admin@school.com sees all schools and can manage any of them.
