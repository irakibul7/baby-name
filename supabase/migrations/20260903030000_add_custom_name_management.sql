-- Phase 3: creator-only custom name management plus more curated origins.

alter table public.name_entries replica identity full;
alter table public.name_reactions replica identity full;
alter table public.family_members replica identity full;

create function public.update_family_name(
  p_name_entry_id uuid,
  p_name text,
  p_script text,
  p_origin text,
  p_meaning text,
  p_gender_list text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_family_id uuid;
begin
  select entry.family_id into v_family_id
  from public.name_entries entry
  where entry.id = p_name_entry_id;

  select member.id into v_member_id
  from public.family_members member
  where member.family_id = v_family_id
    and member.user_id = (select auth.uid());

  if not exists (
    select 1 from public.name_entries entry
    where entry.id = p_name_entry_id
      and entry.is_custom
      and entry.created_by = v_member_id
  ) then
    raise exception 'Only the creator can edit this custom name';
  end if;
  if p_gender_list not in ('boy', 'girl') then raise exception 'Name list must be boy or girl'; end if;
  if char_length(btrim(p_name)) not between 1 and 80 then raise exception 'Name must contain between 1 and 80 characters'; end if;

  update public.name_entries
  set name = btrim(p_name),
      script = nullif(btrim(p_script), ''),
      origin = coalesce(nullif(btrim(p_origin), ''), 'Family'),
      meaning = coalesce(nullif(btrim(p_meaning), ''), 'Family suggestion'),
      gender_list = p_gender_list
  where id = p_name_entry_id;
end;
$$;

create function public.delete_family_name(p_name_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
  v_family_id uuid;
begin
  select entry.family_id into v_family_id
  from public.name_entries entry
  where entry.id = p_name_entry_id;

  select member.id into v_member_id
  from public.family_members member
  where member.family_id = v_family_id
    and member.user_id = (select auth.uid());

  if not exists (
    select 1 from public.name_entries entry
    where entry.id = p_name_entry_id
      and entry.is_custom
      and entry.created_by = v_member_id
  ) then
    raise exception 'Only the creator can delete this custom name';
  end if;

  delete from public.name_entries where id = p_name_entry_id;
end;
$$;

revoke execute on function public.update_family_name(uuid, text, text, text, text, text) from public, anon;
revoke execute on function public.delete_family_name(uuid) from public, anon;
grant execute on function public.update_family_name(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.delete_family_name(uuid) to authenticated;

insert into public.name_entries (family_id, name, script, origin, meaning, gender_list, is_custom)
select family.id, seed.name, seed.script, seed.origin, seed.meaning, seed.gender_list, false
from public.families family
cross join (values
  ('Kerem', 'کرم', 'Turkish', 'Generosity, nobility', 'boy'),
  ('Baran', 'باران', 'Kurdish', 'Rain', 'boy'),
  ('Ayaan', 'ایان', 'Urdu', 'Gift, blessing', 'boy'),
  ('Aylin', 'آیلین', 'Turkish', 'Halo around the moon', 'girl'),
  ('Rojin', 'ڕۆژین', 'Kurdish', 'Bright as the day', 'girl'),
  ('Zoya', 'زویا', 'Urdu', 'Life, loving', 'girl')
) as seed(name, script, origin, meaning, gender_list)
where not exists (
  select 1 from public.name_entries existing
  where existing.family_id = family.id
    and existing.gender_list = seed.gender_list
    and lower(existing.name) = lower(seed.name)
);
