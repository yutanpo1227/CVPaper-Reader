create extension if not exists "pgcrypto";
create extension if not exists vector;

create table if not exists public."Articles" (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  authors text not null,
  year text not null,
  url text not null,
  abstract text not null,
  abstract_embedding vector(1024),
  ft tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(abstract, '')), 'B')
  ) stored,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create index if not exists articles_embedding_idx
  on public."Articles" using ivfflat (abstract_embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists articles_ft_idx
  on public."Articles" using gin (ft);

create or replace function public.set_articles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_articles_updated_at on public."Articles";
create trigger set_articles_updated_at
before update on public."Articles"
for each row
execute procedure public.set_articles_updated_at();

alter table public."Articles" enable row level security;

drop policy if exists articles_select_all on public."Articles";
create policy articles_select_all
  on public."Articles"
  for select
  to anon, authenticated
  using (true);

drop policy if exists articles_write_service on public."Articles";
create policy articles_write_service
  on public."Articles"
  for insert
  to service_role
  with check (true);

drop policy if exists articles_update_service on public."Articles";
create policy articles_update_service
  on public."Articles"
  for update
  to service_role
  using (true)
  with check (true);

drop policy if exists articles_delete_service on public."Articles";
create policy articles_delete_service
  on public."Articles"
  for delete
  to service_role
  using (true);
