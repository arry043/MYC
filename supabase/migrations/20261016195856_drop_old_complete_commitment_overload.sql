-- Drop old 2-argument overload of complete_commitment to resolve ambiguous function calls
drop function if exists public.complete_commitment(uuid, date);

