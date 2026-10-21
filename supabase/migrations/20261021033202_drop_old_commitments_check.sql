-- Drop the auto-named commitments_check constraint from original profiles_and_commitments migration
alter table public.commitments
  drop constraint if exists commitments_check;

