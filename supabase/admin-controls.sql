-- Admin account controls for the School Dashboard.
-- Safe to run on an existing database: this file does not drop or recreate tables.
-- Run once in the Supabase SQL Editor, then refresh the Admin Console.

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

create or replace function public.admin_list_school_users()
returns table (
  id uuid,
  email text,
  full_name text,
  school_name text,
  students bigint,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public, auth
as $$
  select
    u.id,
    u.email,
    p.full_name,
    s.school_name,
    (select count(*) from public.students st where st.user_id = u.id),
    u.created_at
  from auth.users u
  join public.profiles p on p.id = u.id and p.role = 'school'
  left join public.settings s on s.user_id = u.id
  where public.is_admin()
  order by coalesce(s.school_name, p.full_name, u.email)
$$;

revoke all on function public.admin_list_school_users() from public;
grant execute on function public.admin_list_school_users() to authenticated;

create or replace function public.admin_delete_school_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can delete school accounts';
  end if;
  if target = auth.uid() then
    raise exception 'An administrator cannot delete their own account';
  end if;
  if not exists (select 1 from public.profiles where id = target and role = 'school') then
    raise exception 'School account not found';
  end if;
  delete from auth.users where id = target;
end;
$$;

revoke all on function public.admin_delete_school_user(uuid) from public;
grant execute on function public.admin_delete_school_user(uuid) to authenticated;
