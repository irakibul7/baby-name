alter table public.family_members
add column display_name text not null default 'Family member'
check (char_length(display_name) between 1 and 40);

drop function if exists public.join_family(text);

create function public.join_family(p_family_code text, p_display_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_family_code text := upper(btrim(p_family_code));
  v_display_name text := btrim(p_display_name);
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if char_length(v_display_name) not between 1 and 40 then
    raise exception 'Your name must contain between 1 and 40 characters';
  end if;

  if not exists (select 1 from public.families where code = v_family_code) then
    raise exception 'Family invite code was not found';
  end if;

  insert into public.family_members (family_code, user_id, display_name)
  values (v_family_code, v_user_id, v_display_name)
  on conflict (family_code, user_id)
  do update set display_name = excluded.display_name;

  return v_family_code;
end;
$$;

create or replace function public.create_family_poll(
  p_family_code text,
  p_type text,
  p_question text,
  p_names text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_family_code text := upper(btrim(p_family_code));
  v_creator_name text;
  v_poll_id uuid;
  v_name_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select display_name into v_creator_name
  from public.family_members
  where family_code = v_family_code and user_id = v_user_id;

  if v_creator_name is null then
    raise exception 'Join the family before creating a poll';
  end if;

  if p_type not in ('boy', 'girl') then
    raise exception 'Poll type must be boy or girl';
  end if;

  if char_length(btrim(p_question)) not between 1 and 160 then
    raise exception 'Question must contain between 1 and 160 characters';
  end if;

  if coalesce(cardinality(p_names), 0) not between 2 and 5 then
    raise exception 'A poll must contain between 2 and 5 names';
  end if;

  if exists (select 1 from unnest(p_names) as item(name) where char_length(btrim(name)) not between 1 and 80) then
    raise exception 'Each name must contain between 1 and 80 characters';
  end if;

  select count(distinct lower(btrim(name))) into v_name_count from unnest(p_names) as item(name);
  if v_name_count < 2 then
    raise exception 'A poll needs at least two different names';
  end if;

  insert into public.polls (family_code, type, question, created_by, creator_name)
  values (v_family_code, p_type, btrim(p_question), v_user_id, v_creator_name)
  returning id into v_poll_id;

  insert into public.poll_options (poll_id, name, sort_order)
  select
    v_poll_id,
    deduplicated.name,
    (row_number() over (order by deduplicated.first_position) - 1)::smallint
  from (
    select distinct on (lower(btrim(item.name)))
      btrim(item.name) as name,
      item.position as first_position
    from unnest(p_names) with ordinality as item(name, position)
    order by lower(btrim(item.name)), item.position
  ) as deduplicated
  order by deduplicated.first_position;

  return v_poll_id;
end;
$$;

revoke execute on function public.join_family(text, text) from public, anon;
grant execute on function public.join_family(text, text) to authenticated;
