-- Supabase schema for CV Paper Reader
-- Apply this script via Supabase SQL Editor or supabase migration tooling.

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

create unique index if not exists articles_url_key
  on public."Articles" (url);

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

drop function if exists public.search_articles(double precision, integer, vector(1024), text);

create function public.search_articles(
    alpha double precision default 0.5,
    match_count integer default 20,
    query_embedding vector(1024) default null,
    query_text text default null
) returns table (
    id uuid,
    title text,
    authors text,
    year text,
    url text,
    abstract text,
    score double precision
) language plpgsql stable as $$
declare
    ft_query tsquery;
    text_weight double precision := coalesce(alpha, 0.5);
    vector_weight double precision := 1 - text_weight;
begin
    if query_text is not null and length(btrim(query_text)) > 0 then
        ft_query := plainto_tsquery('simple', query_text);
    else
        ft_query := null;
    end if;

    return query
    select
        a.id,
        a.title,
        a.authors,
        a.year,
        a.url,
        a.abstract,
        (
            text_weight * coalesce(case when ft_query is not null then ts_rank(a.ft, ft_query) else 0 end, 0)
            + vector_weight * coalesce(
                case
                    when query_embedding is not null and a.abstract_embedding is not null then
                        1 - (a.abstract_embedding <=> query_embedding)
                    else 0
                end,
                0
            )
        ) as score
    from public."Articles" a
    where
        (ft_query is null or a.ft @@ ft_query)
        or (query_embedding is not null and vector_weight > 0)
    order by score desc
    limit greatest(coalesce(match_count, 20), 1);
end;
$$;
