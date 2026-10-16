-- Check both PostgreSQL current_user and Supabase auth.role() to block updates and deletes
create or replace function public.protect_daily_completion_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') or auth.role() in ('authenticated', 'anon') then
    if tg_op = 'DELETE' then
      raise exception 'Completion records are permanent and cannot be deleted or undone';
    elsif tg_op = 'UPDATE' then
      raise exception 'Completion records and comments are permanent and cannot be modified';
    end if;
  end if;
  return null;
end;
$$;

