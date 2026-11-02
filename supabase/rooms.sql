-- Run once in the Supabase SQL Editor. This leaves the original attendees table intact.
create table if not exists public.rooms (
 id uuid primary key default gen_random_uuid(),
 code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),
 owner_id uuid not null references auth.users(id),
 name text not null check (length(name) between 1 and 100),
 meeting_point text not null default 'Registration desk' check(length(meeting_point) between 1 and 120),
 created_at timestamptz not null default now()
);
create table if not exists public.room_members (
 room_id uuid not null references public.rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 80),
 headline text not null default '' check(length(headline)<=120),
 project text not null check(length(project) between 1 and 500),
 offers text not null check(length(offers) between 1 and 500),
 needs text not null check(length(needs) between 1 and 500),
 skills text[] not null default '{}',
 looking_for text[] not null default '{}',
 discoverable boolean not null default true,
 available boolean not null default true,
 created_at timestamptz not null default now(),
 primary key(room_id,user_id)
);
create table if not exists public.introductions (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.rooms(id) on delete cascade,
 sender_id uuid not null,
 recipient_id uuid not null,
 status text not null default 'pending' check(status in ('pending','accepted','declined','met')),
 created_at timestamptz not null default now(),
 check(sender_id <> recipient_id),
 foreign key(room_id,sender_id) references public.room_members(room_id,user_id),
 foreign key(room_id,recipient_id) references public.room_members(room_id,user_id)
);
create unique index if not exists introductions_pair on public.introductions(room_id,least(sender_id,recipient_id),greatest(sender_id,recipient_id));
alter table public.introductions
 add column if not exists note text not null default '' check(length(note)<=500),
 add column if not exists participant_ids uuid[] not null default '{}';
create or replace function public.is_room_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.room_members where room_id=target and user_id=(select auth.uid()))
 or exists(select 1 from public.rooms where id=target and owner_id=(select auth.uid()));
$$;
revoke all on function public.is_room_member(uuid) from public;
grant execute on function public.is_room_member(uuid) to authenticated;
-- Remove the previously unused event-link field when upgrading an existing project.
alter table public.rooms drop column if exists event_url;
-- Room codes are invitations: lookup is exact, rather than exposing a room directory.
drop function if exists public.find_room(text);
create or replace function public.find_room(invite_code text)
returns table(id uuid,code text,name text,meeting_point text,owner_id uuid)
language sql stable security definer set search_path = '' as $$
 select id,code,name,meeting_point,owner_id from public.rooms
 where code=upper(trim(invite_code));
$$;
revoke all on function public.find_room(text) from public;
-- Callable before sign-in so the QR landing page can show the event and offer login or guest mode.
grant execute on function public.find_room(text) to anon,authenticated;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.introductions enable row level security;
revoke all on public.rooms,public.room_members,public.introductions from anon,authenticated;
grant select,insert on public.rooms to authenticated;
grant select,insert,update on public.room_members to authenticated;
grant select,insert on public.introductions to authenticated;
grant update(status) on public.introductions to authenticated;
drop policy if exists rooms_read on public.rooms;
create policy rooms_read on public.rooms for select to authenticated using(public.is_room_member(id));
drop policy if exists rooms_create on public.rooms;
-- Only real accounts can host. Anonymous (guest) sessions are rejected.
create policy rooms_create on public.rooms for insert to authenticated with check(owner_id=(select auth.uid()) and coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false);
drop policy if exists members_read on public.room_members;
create policy members_read on public.room_members for select to authenticated using(public.is_room_member(room_id) and (discoverable or user_id=(select auth.uid()) or exists(select 1 from public.rooms r where r.id=room_id and r.owner_id=(select auth.uid()))));
drop policy if exists members_create on public.room_members;
create policy members_create on public.room_members for insert to authenticated with check(user_id=(select auth.uid()) and discoverable);
drop policy if exists members_update on public.room_members;
create policy members_update on public.room_members for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists intros_read on public.introductions;
create policy intros_read on public.introductions for select to authenticated using((select auth.uid()) in (sender_id,recipient_id) or (select auth.uid())=any(participant_ids) or exists(select 1 from public.rooms r where r.id=room_id and r.owner_id=(select auth.uid())));
drop policy if exists intros_create on public.introductions;
create policy intros_create on public.introductions for insert to authenticated with check(sender_id=(select auth.uid()) and status='pending' and public.is_room_member(room_id) and not(sender_id=any(participant_ids)) and exists(select 1 from public.room_members m where m.room_id=introductions.room_id and m.user_id=introductions.recipient_id and m.discoverable and m.available) and not exists(select 1 from unnest(participant_ids) invited where not exists(select 1 from public.room_members m where m.room_id=introductions.room_id and m.user_id=invited and m.discoverable and m.available)));
drop policy if exists intros_reply on public.introductions;
create policy intros_reply on public.introductions for update to authenticated using(recipient_id=(select auth.uid()) and status='pending') with check(recipient_id=(select auth.uid()) and status in ('accepted','declined'));
drop policy if exists intros_met on public.introductions;
create policy intros_met on public.introductions for update to authenticated using((select auth.uid()) in(sender_id,recipient_id) and status='accepted') with check((select auth.uid()) in(sender_id,recipient_id) and status='met');
-- v2: networking profile (company, hiring / job-seeking intent, guest flag) and private contact details.
alter table public.room_members
 add column if not exists company text not null default '' check(length(company)<=120),
 add column if not exists intent text not null default 'networking' check(intent in ('hiring','job_seeking','networking')),
 add column if not exists is_guest boolean not null default false;
-- headline is the person's role. Project / offers / needs are optional now; the app derives offers and needs from skills.
alter table public.room_members alter column project set default '',alter column offers set default '',alter column needs set default '';
alter table public.room_members drop constraint if exists room_members_project_check,drop constraint if exists room_members_offers_check,drop constraint if exists room_members_needs_check;
alter table public.room_members add constraint room_members_project_check check(length(project)<=500),add constraint room_members_offers_check check(length(offers)<=500),add constraint room_members_needs_check check(length(needs)<=500);
-- Email lives apart from the discoverable profile: visible to its owner, the room organizer, and anyone whose introduction with them was accepted.
create table if not exists public.member_contacts (
 room_id uuid not null,
 user_id uuid not null,
 email text not null check(length(email) between 3 and 254 and email like '%_@_%.__%'),
 primary key(room_id,user_id),
 foreign key(room_id,user_id) references public.room_members(room_id,user_id) on delete cascade
);
alter table public.member_contacts enable row level security;
revoke all on public.member_contacts from anon,authenticated;
grant select,insert,update on public.member_contacts to authenticated;
drop policy if exists contacts_read on public.member_contacts;
create policy contacts_read on public.member_contacts for select to authenticated using(
 user_id=(select auth.uid())
 or exists(select 1 from public.rooms r where r.id=room_id and r.owner_id=(select auth.uid()))
 or exists(select 1 from public.introductions i where i.room_id=member_contacts.room_id and i.status in ('accepted','met')
  and ((i.sender_id=member_contacts.user_id and i.recipient_id=(select auth.uid())) or (i.recipient_id=member_contacts.user_id and i.sender_id=(select auth.uid())))));
drop policy if exists contacts_insert on public.member_contacts;
create policy contacts_insert on public.member_contacts for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists contacts_update on public.member_contacts;
create policy contacts_update on public.member_contacts for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Contact cards are exchanged after two attendees confirm that they met.
-- They are private to the sender and recipient and appear in the recipient's inbox.
create table if not exists public.contact_cards (
 id uuid primary key default gen_random_uuid(),
 introduction_id uuid not null references public.introductions(id) on delete cascade,
 room_id uuid not null references public.rooms(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 email text not null check(length(email) between 3 and 254 and email like '%_@_%.__%'),
 preferred_mode text not null check(preferred_mode in ('email','whatsapp','telegram','linkedin','other')),
 contact_value text not null check(length(contact_value) between 2 and 200),
 message text not null default '' check(length(message)<=500),
 read_at timestamptz,
 created_at timestamptz not null default now(),
 check(sender_id <> recipient_id),
 unique(introduction_id,sender_id),
 foreign key(room_id,sender_id) references public.room_members(room_id,user_id),
 foreign key(room_id,recipient_id) references public.room_members(room_id,user_id)
);
alter table public.contact_cards enable row level security;
revoke all on public.contact_cards from anon,authenticated;
grant select on public.contact_cards to authenticated;
grant update(read_at) on public.contact_cards to authenticated;
drop policy if exists contact_cards_read on public.contact_cards;
create policy contact_cards_read on public.contact_cards for select to authenticated using((select auth.uid()) in(sender_id,recipient_id));
drop policy if exists contact_cards_mark_read on public.contact_cards;
create policy contact_cards_mark_read on public.contact_cards for update to authenticated using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));

-- One database call keeps the required contact exchange and the "met" state atomic.
create or replace function public.share_contact_card(
 target_introduction uuid,
 contact_email text,
 contact_mode text,
 contact_detail text,
 contact_message text default ''
) returns public.contact_cards
language plpgsql security definer set search_path = '' as $$
declare
 intro public.introductions;
 card public.contact_cards;
 caller uuid := (select auth.uid());
 other_user uuid;
begin
 select * into intro from public.introductions where id=target_introduction;
 if intro.id is null or caller is null or caller not in (intro.sender_id,intro.recipient_id) then
  raise exception 'Introduction not found';
 end if;
 if intro.status not in ('accepted','met') then
  raise exception 'The introduction must be accepted first';
 end if;
 if contact_mode not in ('email','whatsapp','telegram','linkedin','other') then
  raise exception 'Invalid contact mode';
 end if;
 other_user := case when caller=intro.sender_id then intro.recipient_id else intro.sender_id end;
 insert into public.contact_cards(introduction_id,room_id,sender_id,recipient_id,email,preferred_mode,contact_value,message)
 values(intro.id,intro.room_id,caller,other_user,trim(contact_email),contact_mode,trim(contact_detail),left(coalesce(trim(contact_message),''),500))
 on conflict(introduction_id,sender_id) do update set
  email=excluded.email,preferred_mode=excluded.preferred_mode,contact_value=excluded.contact_value,message=excluded.message,created_at=now()
 returning * into card;
 update public.introductions set status='met' where id=intro.id and status='accepted';
 return card;
end;
$$;
revoke all on function public.share_contact_card(uuid,text,text,text,text) from public;
grant execute on function public.share_contact_card(uuid,text,text,text,text) to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='contact_cards' and schemaname='public') then alter publication supabase_realtime add table public.contact_cards; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='member_contacts' and schemaname='public') then alter publication supabase_realtime add table public.member_contacts; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='room_members' and schemaname='public') then alter publication supabase_realtime add table public.room_members; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='introductions' and schemaname='public') then alter publication supabase_realtime add table public.introductions; end if;
end $$;
