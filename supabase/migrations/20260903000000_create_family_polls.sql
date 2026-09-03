create extension if not exists pgcrypto;

create table public.families (
  code text primary key check (code ~ '^[A-Z0-9]{4,12}$'),
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_code text not null references public.families(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (family_code, user_id)
);

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  family_code text not null references public.families(code) on delete cascade,
  type text not null check (type in ('boy', 'girl')),
  question text not null check (char_length(question) between 1 and 160),
  created_by uuid not null references auth.users(id) on delete cascade,
  creator_name text not null default 'Family member' check (char_length(creator_name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  native_script text check (native_script is null or char_length(native_script) <= 80),
  sort_order smallint not null check (sort_order between 0 and 4),
  constraint poll_options_poll_id_id_key unique (poll_id, id),
  constraint poll_options_poll_id_sort_order_key unique (poll_id, sort_order)
);

create unique index poll_options_poll_id_name_key on public.poll_options (poll_id, lower(name));

create table public.poll_votes (
  poll_id uuid not null,
  option_id uuid not null,
  voter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, voter_id),
  constraint poll_votes_option_belongs_to_poll foreign key (poll_id, option_id)
    references public.poll_options(poll_id, id) on delete cascade
);

create index polls_family_code_created_at_idx on public.polls (family_code, created_at desc);
create index poll_options_poll_id_idx on public.poll_options (poll_id);
create index poll_votes_option_id_idx on public.poll_votes (option_id);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

revoke all on table public.families, public.family_members, public.polls, public.poll_options, public.poll_votes from anon, authenticated;
grant select on table public.family_members, public.polls, public.poll_options, public.poll_votes to authenticated;

create policy "Members can view their own memberships"
on public.family_members for select
to authenticated
using ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "Members can view family polls"
on public.polls for select
to authenticated
using (
  exists (
    select 1 from public.family_members member
    where member.family_code = polls.family_code
      and member.user_id = (select auth.uid())
  )
);

create policy "Members can view poll options"
on public.poll_options for select
to authenticated
using (exists (select 1 from public.polls poll where poll.id = poll_options.poll_id));

create policy "Members can view poll votes"
on public.poll_votes for select
to authenticated
using (exists (select 1 from public.polls poll where poll.id = poll_votes.poll_id));

create or replace function public.join_family(p_family_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_family_code text := upper(btrim(p_family_code));
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (select 1 from public.families where code = v_family_code) then
    raise exception 'Family invite code was not found';
  end if;

  insert into public.family_members (family_code, user_id)
  values (v_family_code, v_user_id)
  on conflict do nothing;

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
  v_poll_id uuid;
  v_name_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (
    select 1 from public.family_members
    where family_code = v_family_code and user_id = v_user_id
  ) then
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

  insert into public.polls (family_code, type, question, created_by)
  values (v_family_code, p_type, btrim(p_question), v_user_id)
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

create or replace function public.cast_poll_vote(p_poll_id uuid, p_option_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (
    select 1
    from public.polls poll
    join public.family_members member on member.family_code = poll.family_code
    join public.poll_options option on option.poll_id = poll.id
    where poll.id = p_poll_id
      and option.id = p_option_id
      and member.user_id = v_user_id
  ) then
    raise exception 'Poll option is unavailable';
  end if;

  insert into public.poll_votes (poll_id, option_id, voter_id)
  values (p_poll_id, p_option_id, v_user_id);
exception
  when unique_violation then
    raise exception 'You have already voted in this poll';
end;
$$;

revoke execute on function public.join_family(text) from public, anon;
revoke execute on function public.create_family_poll(text, text, text, text[]) from public, anon;
revoke execute on function public.cast_poll_vote(uuid, uuid) from public, anon;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.create_family_poll(text, text, text, text[]) to authenticated;
grant execute on function public.cast_poll_vote(uuid, uuid) to authenticated;

insert into public.families (code, name)
values ('8H2K', 'Our baby name family')
on conflict (code) do nothing;

do $$
begin
  alter publication supabase_realtime add table public.polls;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.poll_options;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.poll_votes;
exception when duplicate_object then null;
end $$;
