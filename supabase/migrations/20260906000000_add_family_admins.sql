-- Administrators are assigned by a database owner, never by a browser request.
alter table public.family_members add column is_admin boolean not null default false;

create function public.is_family_admin(p_family_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.family_members
    where family_id = p_family_id and user_id = (select auth.uid()) and is_admin);
$$;
revoke execute on function public.is_family_admin(uuid) from public, anon;
grant execute on function public.is_family_admin(uuid) to authenticated;

-- Keep a removal record so the same anonymous account cannot rejoin on refresh.
create table public.removed_family_members (
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  removed_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
alter table public.removed_family_members enable row level security;
revoke all on public.removed_family_members from public, anon, authenticated;

create function public.prevent_removed_member_rejoin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.removed_family_members where family_id = new.family_id and user_id = new.user_id) then
    raise exception 'Your access to this family has been removed';
  end if;
  return new;
end;
$$;
revoke execute on function public.prevent_removed_member_rejoin() from public, anon, authenticated;
create trigger prevent_removed_member_rejoin before insert or update on public.family_members
for each row execute function public.prevent_removed_member_rejoin();

create function public.remove_family_member(p_member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.family_members%rowtype;
begin
  select * into target from public.family_members where id = p_member_id for update;
  if target.id is null then raise exception 'Member was not found'; end if;
  -- Lock the requesting membership so removal and revocation cannot race.
  perform 1 from public.family_members where family_id = target.family_id
    and user_id = (select auth.uid()) and is_admin for update;
  if not found then raise exception 'Only a family admin can remove members'; end if;
  if target.user_id = (select auth.uid()) or target.is_admin then
    raise exception 'Admins cannot remove themselves or another admin';
  end if;
  insert into public.removed_family_members (family_id, user_id)
  values (target.family_id, target.user_id) on conflict do nothing;
  -- Preserve user-saved suggestions as family entries after the creator is removed.
  update public.name_entries set is_custom = true where created_by = target.id;
  delete from public.family_members where id = target.id;
end;
$$;
revoke execute on function public.remove_family_member(uuid) from public, anon;
grant execute on function public.remove_family_member(uuid) to authenticated;

create or replace function public.delete_family_name(p_name_entry_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  entry public.name_entries%rowtype;
  member public.family_members%rowtype;
begin
  select * into entry from public.name_entries where id = p_name_entry_id for update;
  if entry.id is null then raise exception 'Name was not found'; end if;
  select * into member from public.family_members where family_id = entry.family_id
    and user_id = (select auth.uid()) for update;
  if member.id is null or not (member.is_admin or (entry.is_custom and entry.created_by = member.id)) then
    raise exception 'Only an admin or the creator can delete this name';
  end if;
  delete from public.name_entries where id = entry.id;
end;
$$;
revoke execute on function public.delete_family_name(uuid) from public, anon;
grant execute on function public.delete_family_name(uuid) to authenticated;
