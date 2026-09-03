-- Phase 4: shared boy/girl finalists with a reversible family choice.

create table public.family_final_choices (
  family_id uuid not null references public.families(id) on delete cascade,
  gender_list text not null check (gender_list in ('boy', 'girl')),
  name_entry_id uuid not null references public.name_entries(id) on delete cascade,
  chosen_by uuid references public.family_members(id) on delete set null,
  chosen_at timestamptz not null default now(),
  primary key (family_id, gender_list)
);

alter table public.family_final_choices enable row level security;
alter table public.family_final_choices replica identity full;

revoke all on table public.family_final_choices from anon, authenticated;
grant select on table public.family_final_choices to authenticated;

create policy "Members can view family final choices"
on public.family_final_choices for select
to authenticated
using ((select public.is_family_member(family_id)));

create function public.choose_family_final_name(
  p_family_id uuid,
  p_name_entry_id uuid,
  p_gender_list text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  select member.id into v_member_id
  from public.family_members member
  where member.family_id = p_family_id
    and member.user_id = (select auth.uid());

  if v_member_id is null then raise exception 'Family membership is required'; end if;
  if p_gender_list not in ('boy', 'girl') then raise exception 'Name list must be boy or girl'; end if;
  if not exists (
    select 1 from public.name_entries entry
    where entry.id = p_name_entry_id
      and entry.family_id = p_family_id
      and entry.gender_list = p_gender_list
  ) then
    raise exception 'This name is not available in the selected family list';
  end if;

  insert into public.family_final_choices (family_id, gender_list, name_entry_id, chosen_by)
  values (p_family_id, p_gender_list, p_name_entry_id, v_member_id)
  on conflict (family_id, gender_list)
  do update set
    name_entry_id = excluded.name_entry_id,
    chosen_by = excluded.chosen_by,
    chosen_at = now();
end;
$$;

create function public.reopen_family_final_choice(
  p_family_id uuid,
  p_gender_list text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_family_member(p_family_id)) then
    raise exception 'Family membership is required';
  end if;
  if p_gender_list not in ('boy', 'girl') then raise exception 'Name list must be boy or girl'; end if;

  delete from public.family_final_choices
  where family_id = p_family_id and gender_list = p_gender_list;
end;
$$;

revoke execute on function public.choose_family_final_name(uuid, uuid, text) from public, anon;
revoke execute on function public.reopen_family_final_choice(uuid, text) from public, anon;
grant execute on function public.choose_family_final_name(uuid, uuid, text) to authenticated;
grant execute on function public.reopen_family_final_choice(uuid, text) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.family_final_choices;
exception when duplicate_object then null; end $$;
