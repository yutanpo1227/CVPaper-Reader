create or replace function public.search_articles(
    alpha double precision default 0.5,
    match_count integer default 20,
    query_embedding vector default null,
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
