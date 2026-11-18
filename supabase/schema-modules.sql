-- ============================================================
-- School Management Modules — shared schema for the Python app and the APK
-- Run AFTER schema-noauth.sql. Run once: Supabase → SQL Editor → New query → paste all → Run
-- ============================================================

create extension if not exists pgcrypto;

-- School info lives on the settings singleton.
alter table public.settings add column if not exists school_name text;
alter table public.settings add column if not exists status text not null default 'active';

-- --- Classes & subjects ---
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  grade text not null,
  section text not null default '',
  subjects jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- --- Students: link to classes + parent details ---
alter table public.students add column if not exists class_id uuid references public.classes(id) on delete set null;
alter table public.students add column if not exists roll_no text;
alter table public.students add column if not exists father_name text;
alter table public.students add column if not exists parent_contact text;
alter table public.students add column if not exists admission_date date default current_date;

-- --- Timetable: optional class link ---
alter table public.schedule_items add column if not exists class_id uuid references public.classes(id) on delete set null;

-- --- Staff & teachers ---
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  designation text not null default '',
  staff_category text not null default 'teaching' check (staff_category in ('teaching','non-teaching')),
  status text not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- --- Attendance (one row per date/entity) ---
create table if not exists public.attendance (
  date_str text not null,
  entity_type text not null check (entity_type in ('students','staff')),
  record_id uuid not null,
  status text not null check (status in ('present','absent','late','leave')),
  updated_at timestamptz not null default now(),
  primary key (date_str, entity_type, record_id)
);

-- --- Exam marks / results ---
create table if not exists public.exam_marks (
  id uuid primary key default gen_random_uuid(),
  session text not null default '2026-2027',
  term text not null default 'Term 1',
  student_id uuid references public.students(id) on delete cascade,
  subject text not null,
  marks_obtained numeric not null default 0,
  total_marks numeric not null default 100,
  created_at timestamptz not null default now(),
  unique (session, term, student_id, subject)
);

-- --- Fees ---
create table if not exists public.fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  month_year text not null,
  amount_paid numeric not null default 0,
  payment_date date default current_date,
  status text not null default 'paid',
  created_at timestamptz not null default now(),
  unique (student_id, month_year)
);

-- --- Library / book bank ---
create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null default '',
  isbn text not null default '',
  status text not null default 'available' check (status in ('available','issued')),
  issued_to uuid references public.students(id) on delete set null,
  issue_date date,
  created_at timestamptz not null default now()
);

-- --- Transport ---
create table if not exists public.transport_routes (
  id uuid primary key default gen_random_uuid(),
  route_name text not null,
  driver text not null default '',
  vehicle_no text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.transport_passengers (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references public.transport_routes(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  unique (route_id, student_id)
);

-- --- Hostel ---
create table if not exists public.hostel_rooms (
  id uuid primary key default gen_random_uuid(),
  room_no text not null,
  capacity integer not null default 1 check (capacity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.hostel_assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.hostel_rooms(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  unique (room_id, student_id)
);

-- --- Public read/write (no login) ---
alter table public.classes enable row level security;
alter table public.staff enable row level security;
alter table public.attendance enable row level security;
alter table public.exam_marks enable row level security;
alter table public.fees enable row level security;
alter table public.library_books enable row level security;
alter table public.transport_routes enable row level security;
alter table public.transport_passengers enable row level security;
alter table public.hostel_rooms enable row level security;
alter table public.hostel_assignments enable row level security;

drop policy if exists "public_access" on public.classes;
create policy "public_access" on public.classes for all using (true) with check (true);
drop policy if exists "public_access" on public.staff;
create policy "public_access" on public.staff for all using (true) with check (true);
drop policy if exists "public_access" on public.attendance;
create policy "public_access" on public.attendance for all using (true) with check (true);
drop policy if exists "public_access" on public.exam_marks;
create policy "public_access" on public.exam_marks for all using (true) with check (true);
drop policy if exists "public_access" on public.fees;
create policy "public_access" on public.fees for all using (true) with check (true);
drop policy if exists "public_access" on public.library_books;
create policy "public_access" on public.library_books for all using (true) with check (true);
drop policy if exists "public_access" on public.transport_routes;
create policy "public_access" on public.transport_routes for all using (true) with check (true);
drop policy if exists "public_access" on public.transport_passengers;
create policy "public_access" on public.transport_passengers for all using (true) with check (true);
drop policy if exists "public_access" on public.hostel_rooms;
create policy "public_access" on public.hostel_rooms for all using (true) with check (true);
drop policy if exists "public_access" on public.hostel_assignments;
create policy "public_access" on public.hostel_assignments for all using (true) with check (true);

grant all on public.classes to anon, authenticated;
grant all on public.staff to anon, authenticated;
grant all on public.attendance to anon, authenticated;
grant all on public.exam_marks to anon, authenticated;
grant all on public.fees to anon, authenticated;
grant all on public.library_books to anon, authenticated;
grant all on public.transport_routes to anon, authenticated;
grant all on public.transport_passengers to anon, authenticated;
grant all on public.hostel_rooms to anon, authenticated;
grant all on public.hostel_assignments to anon, authenticated;

-- Done. Both the Python desktop app and the APK now have the full module schema.
