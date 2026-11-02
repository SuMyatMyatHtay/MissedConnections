-- Run in Supabase SQL Editor. Enable Authentication > Providers > Anonymous sign-ins.
create table if not exists public.attendees (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 80),
 headline text not null default '' check (char_length(headline) <= 120),
 project text not null default '' check (char_length(project) <= 160),
 bio text not null default '' check (char_length(bio) <= 500),
 skills text[] not null default '{}',
 looking_for text[] not null default '{}',
 discoverable boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.attendees enable row level security;
revoke all on table public.attendees from anon, authenticated;
grant select, insert, update, delete on table public.attendees to authenticated;
-- Only profiles that have opted in are visible; your own profile stays visible to you.
create policy "Discoverable profiles" on public.attendees for select to authenticated
using (discoverable = true or id = (select auth.uid()));
create policy "Create own profile" on public.attendees for insert to authenticated
with check (id = (select auth.uid()));
create policy "Update own profile" on public.attendees for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "Delete own profile" on public.attendees for delete to authenticated
using (id = (select auth.uid()));
