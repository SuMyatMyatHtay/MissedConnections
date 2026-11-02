-- Optional semantic matching upgrade. Run after rooms.sql, then deploy match-room.
create extension if not exists vector with schema extensions;
alter table public.room_members add column if not exists embedding_updated_at timestamptz;
create table if not exists public.member_embeddings (
 room_id uuid not null,
 user_id uuid not null,
 offers extensions.vector(384) not null,
 needs extensions.vector(384) not null,
 fingerprint text not null,
 updated_at timestamptz not null default now(),
 primary key(room_id,user_id),
 foreign key(room_id,user_id) references public.room_members(room_id,user_id) on delete cascade
);
alter table public.member_embeddings enable row level security;
revoke all on public.member_embeddings from anon,authenticated;
grant select,insert,update,delete on public.member_embeddings to service_role;
create or replace function public.semantic_room_matches(target_room uuid, target_user uuid)
returns table(user_id uuid, relevance double precision, reciprocal double precision)
language sql stable set search_path = public,extensions as $$
 select b.user_id,
 greatest(1-(a.needs <=> b.offers),1-(b.needs <=> a.offers))::double precision,
 ((2-(a.needs <=> b.offers)-(b.needs <=> a.offers))/2)::double precision
 from public.member_embeddings a join public.member_embeddings b on a.room_id=b.room_id and a.user_id<>b.user_id
 join public.room_members m on m.room_id=b.room_id and m.user_id=b.user_id
 where a.room_id=target_room and a.user_id=target_user and m.discoverable
 order by ((2-(a.needs <=> b.offers)-(b.needs <=> a.offers))/2) desc limit 12;
$$;
revoke all on function public.semantic_room_matches(uuid,uuid) from public,anon,authenticated;
grant execute on function public.semantic_room_matches(uuid,uuid) to service_role;
-- Cache per-profile enrichment so each edit invokes the model at most once.
create table if not exists public.match_explanations (
 room_id uuid not null,
 viewer_id uuid not null,
 member_id uuid not null,
 fingerprint text not null,
 explanation jsonb not null,
 primary key(room_id,viewer_id,member_id)
);
alter table public.match_explanations enable row level security;
revoke all on public.match_explanations from anon,authenticated;
grant all on public.match_explanations to service_role;
