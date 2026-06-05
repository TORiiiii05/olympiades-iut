-- ============================================================
-- Olympiades IUT – Supabase schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Tables
create table public.players (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  avatar_url text
);

create table public.events (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  emoji text
);

create table public.scores (
  id        uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  event_id  uuid not null references public.events(id)  on delete cascade,
  points    integer not null,
  unique(player_id, event_id)
);

-- Enable realtime
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.scores;

-- ============================================================
-- Row Level Security
-- The admin password check is done on the frontend; the anon
-- key therefore needs full read/write access to all tables.
-- ============================================================

alter table public.players enable row level security;
alter table public.events  enable row level security;
alter table public.scores  enable row level security;

-- Players
create policy "select players" on public.players for select using (true);
create policy "insert players" on public.players for insert with check (true);
create policy "update players" on public.players for update using (true);
create policy "delete players" on public.players for delete using (true);

-- Events
create policy "select events" on public.events for select using (true);
create policy "insert events" on public.events for insert with check (true);
create policy "update events" on public.events for update using (true);
create policy "delete events" on public.events for delete using (true);

-- Scores
create policy "select scores" on public.scores for select using (true);
create policy "insert scores" on public.scores for insert with check (true);
create policy "update scores" on public.scores for update using (true);
create policy "delete scores" on public.scores for delete using (true);

-- ============================================================
-- Storage – avatar images
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "public read avatars"  on storage.objects for select using (bucket_id = 'avatars');
create policy "anon insert avatars"  on storage.objects for insert with check (bucket_id = 'avatars');
create policy "anon update avatars"  on storage.objects for update using (bucket_id = 'avatars');
create policy "anon delete avatars"  on storage.objects for delete using (bucket_id = 'avatars');
