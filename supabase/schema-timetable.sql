-- ============================================================
-- Class timetable grid (Class Planner)
-- Adds a period number to schedule_items so each cell is
-- identified by (class, period). Run once in SQL Editor.
-- ============================================================

alter table public.schedule_items add column if not exists period_no integer;

-- One row per class + period. NULLs are allowed (old list-style rows).
create unique index if not exists schedule_items_class_period_key
  on public.schedule_items (class_id, period_no);

-- Seed rows use day = 'Daily' with the fixed bell times below.
comment on column public.schedule_items.period_no is
  '1..8 period number for the class planner grid; NULL for list-style entries';
