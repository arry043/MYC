-- Update immutability trigger to execute statement-level so DELETE/UPDATE statements from authenticated users are immediately rejected

create or replace function public.protect_daily_completion_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    if tg_op = 'DELETE' then
      raise exception 'Completion records are permanent and cannot be deleted or undone';
    elsif tg_op = 'UPDATE' then
      raise exception 'Completion records and comments are permanent and cannot be modified';
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists tr_protect_daily_completion_immutability on public.daily_completions;

create trigger tr_protect_daily_completion_immutability
  before update or delete on public.daily_completions
  for each statement
  execute function public.protect_daily_completion_immutability();

