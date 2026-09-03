-- Phase 2: persistent family names, reactions, member counts, and linked poll data.
-- Existing poll rows are preserved while stable UUIDs are added to the original
-- invite-code based family tables.

alter table public.families add column id uuid default gen_random_uuid();
alter table public.families add column invite_code text;
update public.families set invite_code = code where invite_code is null;
alter table public.families alter column id set not null;
alter table public.families alter column invite_code set not null;
alter table public.families add constraint families_id_key unique (id);
alter table public.families add constraint families_invite_code_key unique (invite_code);
alter table public.families add constraint families_invite_code_format check (invite_code ~ '^[A-Z0-9]{4,12}$');

alter table public.family_members add column id uuid default gen_random_uuid();
alter table public.family_members add column family_id uuid;
update public.family_members member
set family_id = family.id
from public.families family
where family.code = member.family_code and member.family_id is null;
alter table public.family_members alter column id set not null;
alter table public.family_members alter column family_id set not null;
alter table public.family_members add constraint family_members_id_key unique (id);
alter table public.family_members add constraint family_members_family_id_fkey
  foreign key (family_id) references public.families(id) on delete cascade;
alter table public.family_members add constraint family_members_family_id_user_id_key unique (family_id, user_id);
create index family_members_family_id_idx on public.family_members (family_id);

create table public.name_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  script text check (script is null or char_length(script) <= 80),
  origin text not null check (char_length(origin) between 1 and 40),
  meaning text not null check (char_length(meaning) between 1 and 160),
  gender_list text not null check (gender_list in ('boy', 'girl')),
  is_custom boolean not null default false,
  created_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index name_entries_family_name_gender_key
  on public.name_entries (family_id, lower(name), gender_list);
create index name_entries_family_gender_created_idx
  on public.name_entries (family_id, gender_list, created_at);

create table public.name_reactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  name_entry_id uuid not null references public.name_entries(id) on delete cascade,
  status text not null check (status in ('favorite', 'passed')),
  created_at timestamptz not null default now(),
  unique (member_id, name_entry_id)
);

create index name_reactions_family_id_idx on public.name_reactions (family_id);
create index name_reactions_name_entry_id_idx on public.name_reactions (name_entry_id);

alter table public.polls add column family_id uuid;
update public.polls poll
set family_id = family.id
from public.families family
where family.code = poll.family_code and poll.family_id is null;
alter table public.polls alter column family_id set not null;
alter table public.polls add constraint polls_family_id_fkey
  foreign key (family_id) references public.families(id) on delete cascade;
create index polls_family_id_created_at_idx on public.polls (family_id, created_at desc);

alter table public.poll_options add column name_entry_id uuid references public.name_entries(id) on delete set null;
alter table public.poll_votes add column id uuid default gen_random_uuid();
alter table public.poll_votes add column member_id uuid references public.family_members(id) on delete cascade;
update public.poll_votes vote
set member_id = member.id
from public.polls poll
join public.family_members member
  on member.family_code = poll.family_code
where vote.poll_id = poll.id
  and member.user_id = vote.voter_id
  and vote.member_id is null;
alter table public.poll_votes alter column id set not null;
alter table public.poll_votes add constraint poll_votes_id_key unique (id);
create unique index poll_votes_poll_member_key on public.poll_votes (poll_id, member_id) where member_id is not null;

alter table public.name_entries enable row level security;
alter table public.name_reactions enable row level security;
revoke all on table public.name_entries, public.name_reactions from anon, authenticated;
grant select on table public.name_entries, public.name_reactions to authenticated;

create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members member
    where member.family_id = p_family_id
      and member.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_family_member(uuid) from public, anon;
grant execute on function public.is_family_member(uuid) to authenticated;

drop policy if exists "Members can view their own memberships" on public.family_members;
create policy "Members can view family memberships"
on public.family_members for select
to authenticated
using ((select public.is_family_member(family_id)));

create policy "Members can view family names"
on public.name_entries for select
to authenticated
using ((select public.is_family_member(family_id)));

create policy "Members can view family reactions"
on public.name_reactions for select
to authenticated
using ((select public.is_family_member(family_id)));

drop function if exists public.join_family(text, text);
create function public.join_family(p_family_code text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_family public.families%rowtype;
  v_member public.family_members%rowtype;
  v_display_name text := btrim(p_display_name);
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  if char_length(v_display_name) not between 1 and 40 then
    raise exception 'Your name must contain between 1 and 40 characters';
  end if;

  select * into v_family
  from public.families
  where invite_code = upper(btrim(p_family_code));
  if v_family.id is null then raise exception 'Family invite code was not found'; end if;

  insert into public.family_members (family_code, family_id, user_id, display_name)
  values (v_family.code, v_family.id, v_user_id, v_display_name)
  on conflict (family_code, user_id)
  do update set display_name = excluded.display_name
  returning * into v_member;

  return jsonb_build_object(
    'family_id', v_family.id,
    'member_id', v_member.id,
    'invite_code', v_family.invite_code,
    'family_name', v_family.name
  );
end;
$$;

create function public.create_family_name(
  p_family_id uuid,
  p_name text,
  p_script text,
  p_origin text,
  p_meaning text,
  p_gender_list text,
  p_is_custom boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_name_id uuid;
begin
  select id into v_member_id from public.family_members
  where family_id = p_family_id and user_id = (select auth.uid());
  if v_member_id is null then raise exception 'Family membership is required'; end if;
  if p_gender_list not in ('boy', 'girl') then raise exception 'Name list must be boy or girl'; end if;
  if char_length(btrim(p_name)) not between 1 and 80 then raise exception 'Name must contain between 1 and 80 characters'; end if;

  select id into v_name_id from public.name_entries
  where family_id = p_family_id
    and gender_list = p_gender_list
    and lower(name) = lower(btrim(p_name));

  if v_name_id is null then
    insert into public.name_entries (family_id, name, script, origin, meaning, gender_list, is_custom, created_by)
    values (
      p_family_id,
      btrim(p_name),
      nullif(btrim(p_script), ''),
      coalesce(nullif(btrim(p_origin), ''), 'Family'),
      coalesce(nullif(btrim(p_meaning), ''), 'Family suggestion'),
      p_gender_list,
      p_is_custom,
      v_member_id
    ) returning id into v_name_id;
  end if;

  return v_name_id;
end;
$$;

create function public.set_name_reaction(p_name_entry_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family_id uuid;
  v_member_id uuid;
begin
  if p_status not in ('favorite', 'passed') then raise exception 'Reaction must be favorite or passed'; end if;
  select family_id into v_family_id from public.name_entries where id = p_name_entry_id;
  select id into v_member_id from public.family_members
  where family_id = v_family_id and user_id = (select auth.uid());
  if v_member_id is null then raise exception 'Family membership is required'; end if;

  insert into public.name_reactions (family_id, member_id, name_entry_id, status)
  values (v_family_id, v_member_id, p_name_entry_id, p_status)
  on conflict (member_id, name_entry_id)
  do update set status = excluded.status, created_at = now();
end;
$$;

revoke execute on function public.join_family(text, text) from public, anon;
revoke execute on function public.create_family_name(uuid, text, text, text, text, text, boolean) from public, anon;
revoke execute on function public.set_name_reaction(uuid, text) from public, anon;
grant execute on function public.join_family(text, text) to authenticated;
grant execute on function public.create_family_name(uuid, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.set_name_reaction(uuid, text) to authenticated;

insert into public.name_entries (family_id, name, script, origin, meaning, gender_list, is_custom)
select family.id, seed.name, seed.script, seed.origin, seed.meaning, seed.gender_list, false
from public.families family
cross join (values
  ('Zayn', 'زين', 'Arabic', 'Beauty, grace', 'boy'),
  ('Zayd', 'زيد', 'Arabic', 'Growth, abundance', 'boy'),
  ('Rayyan', 'ريّان', 'Arabic', 'Watered, luxuriant', 'boy'),
  ('Amir', 'أمير', 'Arabic', 'Commander, prince', 'boy'),
  ('Arman', 'آرمان', 'Persian', 'Wish, hope', 'boy'),
  ('Kian', 'کیان', 'Persian', 'King, foundation, pride', 'boy'),
  ('Navid', 'نوید', 'Persian', 'Good news', 'boy'),
  ('Kamran', 'کامران', 'Persian', 'Prosperous, fortunate', 'boy'),
  ('Layla', 'ليلى', 'Arabic', 'Night', 'girl'),
  ('Inaya', 'عناية', 'Arabic', 'Care, concern', 'girl'),
  ('Noor', 'نور', 'Arabic', 'Light', 'girl'),
  ('Darya', 'دریا', 'Persian', 'Sea, ocean', 'girl'),
  ('Shirin', 'شیرین', 'Persian', 'Sweet', 'girl'),
  ('Ava', 'آوا', 'Persian', 'Voice, sound', 'girl'),
  ('Laleh', 'لاله', 'Persian', 'Tulip', 'girl')
) as seed(name, script, origin, meaning, gender_list)
where not exists (
  select 1 from public.name_entries existing
  where existing.family_id = family.id
    and existing.gender_list = seed.gender_list
    and lower(existing.name) = lower(seed.name)
);

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
  v_family public.families%rowtype;
  v_member public.family_members%rowtype;
  v_poll_id uuid;
  v_name_count integer;
  v_option record;
  v_name_entry_id uuid;
  v_native_script text;
begin
  select * into v_family from public.families where invite_code = upper(btrim(p_family_code));
  select * into v_member from public.family_members
  where family_id = v_family.id and user_id = v_user_id;
  if v_member.id is null then raise exception 'Join the family before creating a poll'; end if;
  if p_type not in ('boy', 'girl') then raise exception 'Poll type must be boy or girl'; end if;
  if char_length(btrim(p_question)) not between 1 and 160 then raise exception 'Question must contain between 1 and 160 characters'; end if;
  if coalesce(cardinality(p_names), 0) not between 2 and 5 then raise exception 'A poll must contain between 2 and 5 names'; end if;
  if exists (select 1 from unnest(p_names) as item(name) where char_length(btrim(name)) not between 1 and 80) then
    raise exception 'Each name must contain between 1 and 80 characters';
  end if;
  select count(distinct lower(btrim(name))) into v_name_count from unnest(p_names) as item(name);
  if v_name_count < 2 then raise exception 'A poll needs at least two different names'; end if;

  insert into public.polls (family_code, family_id, type, question, created_by, creator_name)
  values (v_family.code, v_family.id, p_type, btrim(p_question), v_user_id, v_member.display_name)
  returning id into v_poll_id;

  for v_option in
    select distinct on (lower(btrim(item.name)))
      btrim(item.name) as name,
      item.position as first_position
    from unnest(p_names) with ordinality as item(name, position)
    order by lower(btrim(item.name)), item.position
  loop
    v_name_entry_id := null;
    v_native_script := null;
    select entry.id, entry.script into v_name_entry_id, v_native_script
    from public.name_entries entry
    where entry.family_id = v_family.id
      and entry.gender_list = p_type
      and (lower(entry.name) = lower(v_option.name) or entry.script = v_option.name)
    limit 1;

    if v_name_entry_id is null then
      insert into public.name_entries (family_id, name, origin, meaning, gender_list, is_custom, created_by)
      values (v_family.id, v_option.name, 'Family', 'Family suggestion', p_type, true, v_member.id)
      returning id into v_name_entry_id;
    end if;

    insert into public.poll_options (poll_id, name_entry_id, name, native_script, sort_order)
    values (v_poll_id, v_name_entry_id, v_option.name, v_native_script, (v_option.first_position - 1)::smallint);
  end loop;

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
  v_member_id uuid;
begin
  select member.id into v_member_id
  from public.polls poll
  join public.family_members member on member.family_id = poll.family_id
  join public.poll_options option on option.poll_id = poll.id
  where poll.id = p_poll_id
    and option.id = p_option_id
    and member.user_id = v_user_id;
  if v_member_id is null then raise exception 'Poll option is unavailable'; end if;

  insert into public.poll_votes (poll_id, option_id, voter_id, member_id)
  values (p_poll_id, p_option_id, v_user_id, v_member_id);
exception when unique_violation then
  raise exception 'You have already voted in this poll';
end;
$$;

do $$ begin
  alter publication supabase_realtime add table public.family_members;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.name_entries;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.name_reactions;
exception when duplicate_object then null; end $$;
