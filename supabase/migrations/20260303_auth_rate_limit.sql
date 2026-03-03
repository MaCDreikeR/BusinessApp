create table if not exists public.auth_rate_limits (
  email text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default timezone('utc'::text, now()),
  lock_until timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_auth_rate_limits_lock_until
  on public.auth_rate_limits (lock_until);

create index if not exists idx_auth_rate_limits_updated_at
  on public.auth_rate_limits (updated_at);

alter table public.auth_rate_limits enable row level security;

drop policy if exists "deny_all_auth_rate_limits" on public.auth_rate_limits;

create policy "deny_all_auth_rate_limits"
  on public.auth_rate_limits
  for all
  using (false)
  with check (false);

create or replace function public.update_updated_at_auth_rate_limits()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_update_updated_at_auth_rate_limits on public.auth_rate_limits;

create trigger trg_update_updated_at_auth_rate_limits
before update on public.auth_rate_limits
for each row
execute function public.update_updated_at_auth_rate_limits();
