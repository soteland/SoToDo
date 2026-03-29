-- ============================================================
-- SoToDo — Database Schema
-- Safe to re-run: drops everything first, then recreates.
-- Run in Supabase SQL Editor to reset + rebuild from scratch.
-- ============================================================

-- ============================================================
-- RESET — drop all app objects before recreating
-- ============================================================

drop table if exists public.ai_usage_log            cascade;
drop table if exists public.ai_enrichment_cache     cascade;
drop table if exists public.hjemmelager             cascade;
drop table if exists public.recipe_share_tokens     cascade;
drop table if exists public.recipe_items            cascade;
drop table if exists public.recipes                 cascade;
drop table if exists public.item_associations       cascade;
drop table if exists public.purchase_history        cascade;
drop table if exists public.list_items              cascade;
drop table if exists public.list_share_invites      cascade;
drop table if exists public.list_members            cascade;
drop table if exists public.lists                   cascade;
drop table if exists public.list_types              cascade;
drop table if exists public.profiles                cascade;
drop table if exists public.invite_codes            cascade;

drop function if exists public.normalize_item_name()              cascade;
drop function if exists public.normalize_item_name_keyed()        cascade;
drop function if exists public.member_list_ids()                  cascade;
drop function if exists public.owned_list_ids()                   cascade;
drop function if exists public.accessible_list_ids()              cascade;
-- handle_new_user and handle_new_user_setup are NOT dropped here because
-- cascade would attempt to drop the trigger on auth.users (which we don't own).
-- They are updated via create or replace function below.
drop function if exists public.seed_default_list_types(uuid)      cascade;
drop function if exists public.seed_default_recipes(uuid)         cascade;
drop function if exists public.check_off_item(uuid)               cascade;
drop function if exists public.uncheck_item(uuid)                 cascade;
drop function if exists public.verify_invite_code(text)           cascade;
drop function if exists public.create_admin_invite(text)          cascade;
drop function if exists public.ai_within_rate_limit(text)         cascade;

-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table public.invite_codes (
  id           uuid        primary key default gen_random_uuid(),
  code         text        unique not null,
  created_by   uuid        references auth.users(id) on delete set null,
  used_by      uuid        references auth.users(id) on delete set null,
  used_at      timestamptz,
  max_uses     int         not null default 1,
  use_count    int         not null default 0,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

create table public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  display_name text,
  color        text        not null default '#6BBF8E',
  is_admin     bool        not null default false,
  created_at   timestamptz not null default now()
);

create table public.list_types (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  icon_name    text        not null default 'list',
  color        text        not null default '#6BBF8E',
  sort_order   int         not null default 0,
  is_default   bool        not null default false,
  created_at   timestamptz not null default now(),
  unique (user_id, name)
);

create table public.lists (
  id                 uuid        primary key default gen_random_uuid(),
  owner_id           uuid        not null default (auth.uid()) references auth.users(id) on delete cascade,
  list_type_id       uuid        not null references public.list_types(id) on delete restrict,
  name               text        not null,
  is_visible_on_home bool        not null default true,
  is_primary         bool        not null default false,
  history_shared_at  timestamptz,
  created_at         timestamptz not null default now()
);

create table public.list_members (
  id           uuid        primary key default gen_random_uuid(),
  list_id      uuid        not null references public.lists(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  invited_by   uuid        references auth.users(id) on delete set null,
  display_name text,
  color        text        not null default '#7EB8D4',
  joined_at    timestamptz not null default now(),
  unique (list_id, user_id)
);

create table public.list_share_invites (
  id                            uuid        primary key default gen_random_uuid(),
  list_id                       uuid        not null references public.lists(id) on delete cascade,
  token                         text        unique not null default encode(gen_random_bytes(24), 'base64url'),
  invited_by                    uuid        not null references auth.users(id) on delete cascade,
  history_warning_acknowledged  bool        not null default false,
  expires_at                    timestamptz not null default now() + interval '7 days',
  used_by                       uuid        references auth.users(id) on delete set null,
  used_at                       timestamptz,
  created_at                    timestamptz not null default now()
);

create table public.list_items (
  id                  uuid        primary key default gen_random_uuid(),
  list_id             uuid        not null references public.lists(id) on delete cascade,
  name                text        not null,
  name_normalized     text        not null,
  subcategory         text,
  quantity            int         not null default 1,
  is_checked          bool        not null default false,
  checked_at          timestamptz,
  added_at            timestamptz not null default now(),
  added_by            uuid        references auth.users(id) on delete set null,
  is_starred          bool        not null default false,
  comment             text,
  purchase_count      int         not null default 0,
  last_purchased_at   timestamptz,
  avg_frequency_days  float,
  sort_order          int         not null default 0,
  unit                text        not null default 'stk',
  is_pantry_staple    bool        not null default false
);

create index list_items_list_id_idx       on public.list_items(list_id);
create index list_items_name_idx          on public.list_items(name_normalized);
create index list_items_checked_idx       on public.list_items(list_id, is_checked);

create table public.purchase_history (
  id             uuid        primary key default gen_random_uuid(),
  list_item_id   uuid        not null references public.list_items(id) on delete cascade,
  purchased_by   uuid        references auth.users(id) on delete set null,
  quantity       int         not null default 1,
  purchased_at   timestamptz not null default now(),
  day_of_week    smallint    not null
);

create index purchase_history_item_idx on public.purchase_history(list_item_id);
create index purchase_history_user_idx on public.purchase_history(purchased_by);

create table public.item_associations (
  id                        uuid    primary key default gen_random_uuid(),
  user_id                   uuid    not null references auth.users(id) on delete cascade,
  item_name_normalized      text    not null,
  list_type_id              uuid    references public.list_types(id) on delete cascade,
  associated_name_normalized text   not null,
  weight                    float   not null default 0.8 check (weight between 0 and 1),
  source                    text    not null default 'admin' check (source in ('admin', 'learned')),
  created_at                timestamptz not null default now(),
  unique (user_id, item_name_normalized, associated_name_normalized)
);

create table public.recipes (
  id           uuid        primary key default gen_random_uuid(),
  owner_id     uuid        not null references auth.users(id) on delete cascade,
  name         text        not null,
  description  text,
  instructions text[]      not null default '{}',
  created_at   timestamptz not null default now()
);

create table public.recipe_items (
  id                   uuid  primary key default gen_random_uuid(),
  recipe_id            uuid  not null references public.recipes(id) on delete cascade,
  item_name            text  not null,
  item_name_normalized text  not null,
  quantity             int   not null default 1,
  unit                 text  not null default 'stk',
  sort_order           int   not null default 0,
  is_pantry_staple     bool  not null default false
);

create table public.recipe_share_tokens (
  id           uuid        primary key default gen_random_uuid(),
  recipe_id    uuid        not null references public.recipes(id) on delete cascade,
  token        text        unique not null default encode(gen_random_bytes(24), 'base64url'),
  created_by   uuid        not null references auth.users(id) on delete cascade,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

create table public.hjemmelager (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  item_name           text        not null,
  item_name_normalized text       not null,
  list_type_id        uuid        references public.list_types(id) on delete set null,
  quantity            int         not null default 1,
  unit                text        not null default 'stk',
  added_at            timestamptz not null default now(),
  expires_at          timestamptz,
  duration_days       int
);

create table public.ai_enrichment_cache (
  id                        uuid        primary key default gen_random_uuid(),
  name_normalized           text        not null,
  list_type_name            text        not null,
  subcategory               text,
  avg_frequency_days        int,
  hjemmelager_duration_days int,
  created_at                timestamptz not null default now(),
  unique (name_normalized, list_type_name)
);

create table public.ai_usage_log (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  function_name text        not null,
  tokens_used   int,
  called_at     timestamptz not null default now()
);

create index ai_usage_log_user_day_idx on public.ai_usage_log(user_id, called_at);

-- ============================================================
-- TRIGGERS: auto-normalize item names
-- ============================================================

create or replace function public.normalize_item_name()
returns trigger
language plpgsql
as $$
begin
  new.name_normalized := lower(trim(new.name));
  return new;
end;
$$;

create or replace function public.normalize_item_name_keyed()
returns trigger
language plpgsql
as $$
begin
  new.item_name_normalized := lower(trim(new.item_name));
  return new;
end;
$$;

drop trigger if exists normalize_list_item_name on public.list_items;
create trigger normalize_list_item_name
  before insert or update of name on public.list_items
  for each row execute procedure public.normalize_item_name();

drop trigger if exists normalize_recipe_item_name on public.recipe_items;
create trigger normalize_recipe_item_name
  before insert or update of item_name on public.recipe_items
  for each row execute procedure public.normalize_item_name_keyed();

drop trigger if exists normalize_hjemmelager_name on public.hjemmelager;
create trigger normalize_hjemmelager_name
  before insert or update of item_name on public.hjemmelager
  for each row execute procedure public.normalize_item_name_keyed();

-- ============================================================
-- HELPER FUNCTIONS (security definer = runs as postgres
-- superuser, bypasses RLS on inner queries — this is what
-- prevents the lists <-> list_members circular RLS dependency)
-- ============================================================

-- List IDs where current user is a member.
-- Queries list_members as superuser (no RLS) so it can safely
-- be called from lists policies without causing recursion.
create or replace function public.member_list_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select list_id from public.list_members where user_id = auth.uid()
$$;

-- List IDs owned by current user.
-- Queries lists as superuser (no RLS) so it can safely be
-- called from list_members policies without causing recursion.
create or replace function public.owned_list_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select id from public.lists where owner_id = auth.uid()
$$;

-- All list IDs accessible to current user (owned + member of).
create or replace function public.accessible_list_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select id   from public.lists        where owner_id = auth.uid()
  union
  select list_id from public.list_members where user_id = auth.uid()
$$;

-- AI rate limit check: max 20 calls per function per user per day.
create or replace function public.ai_within_rate_limit(fn_name text)
returns bool
language sql
security definer
set search_path = ''
stable
as $$
  select count(*) < 20
  from public.ai_usage_log
  where user_id = auth.uid()
    and function_name = fn_name
    and called_at > now() - interval '24 hours'
$$;

-- Verify an invite code is valid (used during sign-up, no auth required).
create or replace function public.verify_invite_code(p_code text)
returns bool
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.invite_codes
    where code = p_code
      and use_count < max_uses
      and (expires_at is null or expires_at > now())
  )
$$;

-- Consume an invite code after successful sign-up.
create or replace function public.use_invite_code(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.invite_codes
  set use_count = use_count + 1,
      used_by   = auth.uid(),
      used_at   = now()
  where code = p_code
    and use_count < max_uses
    and (expires_at is null or expires_at > now());
end;
$$;

-- Check off an item: records purchase history and updates stats.
create or replace function public.check_off_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quantity      int;
  v_last_purchased timestamptz;
  v_purchase_count int;
  v_new_avg       float;
begin
  select quantity, last_purchased_at, purchase_count
  into   v_quantity, v_last_purchased, v_purchase_count
  from   public.list_items
  where  id = p_item_id
    and  list_id in (select public.accessible_list_ids());

  if not found then
    raise exception 'Item not found or access denied';
  end if;

  insert into public.purchase_history (list_item_id, purchased_by, quantity, day_of_week)
  values (p_item_id, auth.uid(), v_quantity, extract(dow from now())::smallint);

  if v_last_purchased is not null then
    v_new_avg := (
      v_purchase_count * coalesce(
        (select avg_frequency_days from public.list_items where id = p_item_id), 0
      ) + extract(epoch from now() - v_last_purchased) / 86400.0
    ) / (v_purchase_count + 1);
  end if;

  update public.list_items
  set is_checked         = true,
      checked_at         = now(),
      purchase_count     = purchase_count + 1,
      last_purchased_at  = now(),
      avg_frequency_days = coalesce(v_new_avg, avg_frequency_days)
  where id = p_item_id;
end;
$$;

-- Restore a checked-off item to the active list.
create or replace function public.uncheck_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.list_items
  set is_checked = false, checked_at = null
  where id = p_item_id
    and list_id in (select public.accessible_list_ids());
end;
$$;

-- Join a shared list using a one-time invite token.
create or replace function public.join_list_via_invite(p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.list_share_invites%rowtype;
  v_owner  uuid;
begin
  select * into v_invite
  from public.list_share_invites
  where token = p_token
    and used_at is null
    and (expires_at is null or expires_at > now());

  if not found then
    return json_build_object('error', 'Invitasjonen er ugyldig eller utløpt');
  end if;

  select owner_id into v_owner from public.lists where id = v_invite.list_id;

  if v_owner = auth.uid() then
    return json_build_object('error', 'Du eier allerede denne listen');
  end if;

  if exists (
    select 1 from public.list_members
    where list_id = v_invite.list_id and user_id = auth.uid()
  ) then
    return json_build_object('already_member', true, 'list_id', v_invite.list_id);
  end if;

  insert into public.list_members (list_id, user_id, invited_by)
  values (v_invite.list_id, auth.uid(), v_invite.invited_by)
  on conflict (list_id, user_id) do nothing;

  update public.lists
  set history_shared_at = coalesce(history_shared_at, now())
  where id = v_invite.list_id;

  update public.list_share_invites
  set used_by = auth.uid(), used_at = now()
  where id = v_invite.id;

  return json_build_object('success', true, 'list_id', v_invite.list_id);
end;
$$;

-- Seed default list types for a new user.
create or replace function public.seed_default_list_types(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  insert into public.list_types (user_id, name, icon_name, color, sort_order, is_default)
  values
    (p_user_id, 'Handleliste',  'cart-shopping',      '#6BBF8E', 0, true),
    (p_user_id, 'Apotek',       'pills',              '#7EB8D4', 1, false),
    (p_user_id, 'Interiør',     'kitchen-set',        '#E8C86A', 2, false),
    (p_user_id, 'Verktøy',      'screwdriver-wrench', '#3D3D3D', 3, false),
    (p_user_id, 'Gaveønsker',   'gifts',              '#9B8EC4', 4, false),
    (p_user_id, 'Julegaver',    'tree-christmas',     '#D97B7B', 5, false),
    (p_user_id, 'Diverse',      'list',               '#8FAAB8', 6, false)
  on conflict do nothing;
end;
$$;

-- Seed 10 default Norwegian recipes for a new user.
create or replace function public.seed_default_recipes(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_id uuid;
begin
  -- 1. Tacokveld
  insert into public.recipes (owner_id, name, description, instructions)
  values (p_user_id, 'Tacokveld', 'Klassisk fredagstaco for hele familien', array[
    'Brun kjøttdeigen i en stekepanne på middels varme.',
    'Tilsett tacokrydder og litt vann, la det koke inn i 5 minutter.',
    'Varm tortillaene i stekeovnen eller på en tørr panne.',
    'Sett frem alle tilbehørene i skåler og la alle lage sin egen taco.'
  ])
  returning id into v_id;
  insert into public.recipe_items (recipe_id, item_name, item_name_normalized, quantity, unit, sort_order, is_pantry_staple) values
    (v_id, 'Kjøttdeig',   'kjøttdeig',   400, 'g',   1, false),
    (v_id, 'Tacokrydder', 'tacokrydder', 1,   'stk', 2, true),
    (v_id, 'Tortillas',   'tortillas',   8,   'stk', 3, false),
    (v_id, 'Salsa',       'salsa',       1,   'stk', 4, false),
    (v_id, 'Rømme',       'rømme',       2,   'dl',  5, false),
    (v_id, 'Gulost',      'gulost',      150, 'g',   6, false),
    (v_id, 'Salat',       'salat',       1,   'stk', 7, false),
    (v_id, 'Tomat',       'tomat',       2,   'stk', 8, false),
    (v_id, 'Paprika',     'paprika',     1,   'stk', 9, false),
    (v_id, 'Løk',         'løk',         1,   'stk', 10, false);

  -- 2. Spagetti Bolognese
  insert into public.recipes (owner_id, name, description, instructions)
  values (p_user_id, 'Spagetti Bolognese', 'Italiensk klassiker med kjøttsaus', array[
    'Hakk løk og hvitløk, stek i olivenolje til myk og blank.',
    'Tilsett kjøttdeig og brun godt. Krydre med salt og pepper.',
    'Ha i hermetiske tomater, tomatpuré og buljongterning. La sausen småkoke i 20 minutter.',
    'Kok spagetti etter anvisning på pakken. Server med saus og revet parmesan.'
  ])
  returning id into v_id;
  insert into public.recipe_items (recipe_id, item_name, item_name_normalized, quantity, unit, sort_order, is_pantry_staple) values
    (v_id, 'Spagetti',           'spagetti',           400, 'g',   1, false),
    (v_id, 'Kjøttdeig',          'kjøttdeig',          400, 'g',   2, false),
    (v_id, 'Hermetiske tomater', 'hermetiske tomater', 2,   'stk', 3, false),
    (v_id, 'Løk',                'løk',                1,   'stk', 4, false),
    (v_id, 'Hvitløk',            'hvitløk',            3,   'stk', 5, false),
    (v_id, 'Tomatpuré',          'tomatpuré',          1,   'stk', 6, true),
    (v_id, 'Buljongterning',     'buljongterning',     1,   'stk', 7, true),
    (v_id, 'Olivenolje',         'olivenolje',         2,   'dl',  8, true);

  -- 3. Hjemmelaget pizza
  insert into public.recipes (owner_id, name, description, instructions)
  values (p_user_id, 'Hjemmelaget pizza', 'Sprø bunn med valgfritt fyll', array[
    'Bland hvetemel, gjær, salt og vann. Elt deigen i 10 minutter og la heve i 1 time.',
    'Kjevle ut deigen tynt på melet underlag.',
    'Smør på hermetiske tomater og fordel fyll etter ønske.',
    'Stek på 250°C i 10–12 minutter til bunnen er sprø og osten er gyllen.'
  ])
  returning id into v_id;
  insert into public.recipe_items (recipe_id, item_name, item_name_normalized, quantity, unit, sort_order, is_pantry_staple) values
    (v_id, 'Hvetemel',           'hvetemel',           500, 'g',   1, true),
    (v_id, 'Gjær',               'gjær',               1,   'stk', 2, false),
    (v_id, 'Hermetiske tomater', 'hermetiske tomater', 1,   'stk', 3, false),
    (v_id, 'Gulost',             'gulost',             200, 'g',   4, false),
    (v_id, 'Kjøttdeig',          'kjøttdeig',          300, 'g',   5, false),
    (v_id, 'Paprika',            'paprika',            1,   'stk', 6, false),
    (v_id, 'Løk',                'løk',                1,   'stk', 7, false),
    (v_id, 'Bacon',              'bacon',              150, 'g',   8, false);

  -- 4. Kylling wok
  insert into public.recipes (owner_id, name, description, instructions)
  values (p_user_id, 'Kylling wok', 'Rask og sunn hverdagsmiddag', array[
    'Kok ris etter anvisning.',
    'Skjær kylling i biter og stek på høy varme i olje til gyldenbrun.',
    'Tilsett grønnsaker og stek videre i 3–4 minutter.',
    'Ha i soyasaus, hvitløk og sesamolje. Rør godt og server over ris.'
  ])
  returning id into v_id;
  insert into public.recipe_items (recipe_id, item_name, item_name_normalized, quantity, unit, sort_order, is_pantry_staple) values
    (v_id, 'Kyllingfilet', 'kyllingfilet', 400, 'g',   1, false),
    (v_id, 'Ris',          'ris',          3,   'dl',  2, true),
    (v_id, 'Paprika',      'paprika',      1,   'stk', 3, false),
    (v_id, 'Gulrot',       'gulrot',       2,   'stk', 4, false),
    (v_id, 'Løk',          'løk',          1,   'stk', 5, false),
    (v_id, 'Soyasaus',     'soyasaus',     3,   'dl',  6, true),
    (v_id, 'Hvitløk',      'hvitløk',      2,   'stk', 7, false),
    (v_id, 'Sesamolje',    'sesamolje',    1,   'dl',  8, true);

  -- 5. Laksemiddag
  insert into public.recipes (owner_id, name, description, instructions)
  values (p_user_id, 'Laksemiddag', 'Enkel og god hverdagsmiddag med fisk', array[
    'Kok poteter i saltet vann i 20 minutter.',
    'Stek laksen i smør på middels varme, ca. 4 minutter per side. Krydre med salt og pepper.',
    'Kok brokkoli i 3–4 minutter.',
    'Lag en enkel saus av fløte, smør og sitron. Server alt sammen.'
  ])
  returning id into v_id;
  insert into public.recipe_items (recipe_id, item_name, item_name_normalized, quantity, unit, sort_order, is_pantry_staple) values
    (v_id, 'Laks',     'laks',     600, 'g',   1, false),
    (v_id, 'Potet',    'potet',    800, 'g',   2, false),
    (v_id, 'Brokkoli', 'brokkoli', 1,   'stk', 3, false),
    (v_id, 'Smør',     'smør',     50,  'g',   4, true),
    (v_id, 'Fløte',    'fløte',    2,   'dl',  5, false),
    (v_id, 'Sitron',   'sitron',   1,   'stk', 6, false);

  -- 6. Pølse og pommes frites
  insert into public.recipes (owner_id, name, description, instructions)
  values (p_user_id, 'Pølse og pommes frites', 'Barnas favoritt', array[
    'Stek pommes frites i ovnen etter anvisning, ca. 20 minutter på 220°C.',
    'Grill eller stek pølsene.',
    'Server med ketchup og sennep.'
  ])
  returning id into v_id;
  insert into public.recipe_items (recipe_id, item_name, item_name_normalized, quantity, unit, sort_order, is_pantry_staple) values
    (v_id, 'Pølser',        'pølser',        8,   'stk', 1, false),
    (v_id, 'Pommes frites', 'pommes frites', 400, 'g',   2, false),
    (v_id, 'Ketchup',       'ketchup',       1,   'stk', 3, false),
    (v_id, 'Sennep',        'sennep',        1,   'stk', 4, false);

  -- 7. Havregrøt
  insert into public.recipes (owner_id, name, description, instructions)
  values (p_user_id, 'Havregrøt', 'Enkel og mettende frokost', array[
    'Kok opp melk i en kjele.',
    'Tilsett havregryn og rør godt. Kok på lav varme i 3–5 minutter.',
    'Server med sukker, smør og eventuelt bær eller syltetøy.'
  ])
  returning id into v_id;
  insert into public.recipe_items (recipe_id, item_name, item_name_normalized, quantity, unit, sort_order, is_pantry_staple) values
    (v_id, 'Havregryn', 'havregryn', 2, 'dl',  1, true),
    (v_id, 'Melk',      'melk',      4, 'dl',  2, false),
    (v_id, 'Sukker',    'sukker',    1, 'stk', 3, true),
    (v_id, 'Smør',      'smør',      1, 'stk', 4, true);

  -- 8. Pannekaker
  insert into public.recipes (owner_id, name, description, instructions)
  values (p_user_id, 'Pannekaker', 'Tynne og gode pannekaker', array[
    'Pisk sammen hvetemel, egg og halvparten av melken til en jevn røre uten klumper.',
    'Tilsett resten av melken, smør og sukker. La røren hvile i 30 minutter.',
    'Stek tynne pannekaker i smurt panne på middels-høy varme.',
    'Server med syltetøy, sukker eller rømme.'
  ])
  returning id into v_id;
  insert into public.recipe_items (recipe_id, item_name, item_name_normalized, quantity, unit, sort_order, is_pantry_staple) values
    (v_id, 'Hvetemel', 'hvetemel', 300, 'g',   1, true),
    (v_id, 'Egg',      'egg',      3,   'stk', 2, false),
    (v_id, 'Melk',     'melk',     5,   'dl',  3, false),
    (v_id, 'Smør',     'smør',     50,  'g',   4, true),
    (v_id, 'Sukker',   'sukker',   1,   'stk', 5, true);

  -- 9. Hamburger
  insert into public.recipes (owner_id, name, description, instructions)
  values (p_user_id, 'Hamburger', 'Hjemmelaget burger med alt tilbehør', array[
    'Form kjøttdeig til burgerkaker, krydre med salt og pepper.',
    'Stek på høy varme, ca. 3–4 minutter per side. Legg ost på de siste 2 minuttene.',
    'Rist hamburgerbrødene lett i panne.',
    'Bygg burgeren med salat, tomat, løk, ketchup og majones.'
  ])
  returning id into v_id;
  insert into public.recipe_items (recipe_id, item_name, item_name_normalized, quantity, unit, sort_order, is_pantry_staple) values
    (v_id, 'Kjøttdeig',     'kjøttdeig',     500, 'g',   1, false),
    (v_id, 'Hamburgerbrød', 'hamburgerbrød', 4,   'stk', 2, false),
    (v_id, 'Salat',         'salat',         1,   'stk', 3, false),
    (v_id, 'Tomat',         'tomat',         2,   'stk', 4, false),
    (v_id, 'Løk',           'løk',           1,   'stk', 5, false),
    (v_id, 'Gulost',        'gulost',        100, 'g',   6, false),
    (v_id, 'Ketchup',       'ketchup',       1,   'stk', 7, false),
    (v_id, 'Majones',       'majones',       1,   'stk', 8, false);

  -- 10. Fiskesuppe
  insert into public.recipes (owner_id, name, description, instructions)
  values (p_user_id, 'Fiskesuppe', 'Kremet norsk fiskesuppe', array[
    'Smelt smør i en gryte, stek purre og gulrot i 3 minutter.',
    'Tilsett vann og buljongterning, kok opp. Ha i potet og kok i 10 minutter.',
    'Tilsett fløte og la suppen småkoke i 5 minutter.',
    'Ha i laksebiter og kok forsiktig i 4–5 minutter. Smak til med salt og pepper.'
  ])
  returning id into v_id;
  insert into public.recipe_items (recipe_id, item_name, item_name_normalized, quantity, unit, sort_order, is_pantry_staple) values
    (v_id, 'Laks',          'laks',          400, 'g',   1, false),
    (v_id, 'Fløte',         'fløte',         2,   'dl',  2, false),
    (v_id, 'Buljongterning','buljongterning',1,   'stk', 3, true),
    (v_id, 'Gulrot',        'gulrot',        2,   'stk', 4, false),
    (v_id, 'Potet',         'potet',         400, 'g',   5, false),
    (v_id, 'Purre',         'purre',         1,   'stk', 6, false),
    (v_id, 'Smør',          'smør',          50,  'g',   7, true);
end;
$$;

-- Auto-create profile when a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-seed list types + create default Handleliste after profile creation.
create or replace function public.handle_new_user_setup()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  v_list_type_id uuid;
begin
  perform public.seed_default_list_types(new.id);

  select id into v_list_type_id
  from   public.list_types
  where  user_id = new.id and is_default = true
  limit  1;

  if v_list_type_id is not null then
    insert into public.lists (owner_id, list_type_id, name, is_primary)
    values (new.id, v_list_type_id, 'Handleliste', true);
  end if;

  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_user_setup();

-- Create an admin invite code (run manually after first login).
-- Usage: select public.create_admin_invite('YOUR-SECRET-CODE');
create or replace function public.create_admin_invite(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.invite_codes (code, max_uses, created_by)
  values (p_code, 100, auth.uid())
  on conflict (code) do nothing;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles             enable row level security;
alter table public.invite_codes         enable row level security;
alter table public.list_types           enable row level security;
alter table public.lists                enable row level security;
alter table public.list_members         enable row level security;
alter table public.list_share_invites   enable row level security;
alter table public.list_items           enable row level security;
alter table public.purchase_history     enable row level security;
alter table public.item_associations    enable row level security;
alter table public.recipes              enable row level security;
alter table public.recipe_items         enable row level security;
alter table public.recipe_share_tokens  enable row level security;
alter table public.hjemmelager          enable row level security;
alter table public.ai_enrichment_cache  enable row level security;
alter table public.ai_usage_log         enable row level security;

-- profiles
create policy "profiles: own" on public.profiles
  for all using (id = auth.uid());

create policy "profiles: co-members can view" on public.profiles
  for select using (
    id in (
      select user_id from public.list_members
      where list_id in (select public.accessible_list_ids())
    )
  );

-- invite_codes
create policy "invite_codes: admin manage" on public.invite_codes
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin)
  );
create policy "invite_codes: public verify" on public.invite_codes
  for select using (true);

-- list_types
create policy "list_types: own" on public.list_types
  for all using (user_id = auth.uid());

-- lists
-- Note: "lists: member read" uses member_list_ids() (security definer) to avoid
-- the circular dependency with list_members policies that reference lists.
create policy "lists: owner" on public.lists
  for all using (owner_id = auth.uid());

create policy "lists: member read" on public.lists
  for select using (id in (select public.member_list_ids()));

-- list_members
-- Note: policies that reference lists use owned_list_ids() (security definer)
-- to avoid the circular dependency: lists ↔ list_members.
create policy "list_members: own" on public.list_members
  for all using (user_id = auth.uid());

create policy "list_members: owner manage" on public.list_members
  for all using (list_id in (select public.owned_list_ids()));

create policy "list_members: view co-members" on public.list_members
  for select using (
    list_id in (
      select public.member_list_ids()
      union
      select public.owned_list_ids()
    )
  );

-- list_share_invites
create policy "list_share_invites: owner" on public.list_share_invites
  for all using (list_id in (select public.owned_list_ids()));

create policy "list_share_invites: public read by token" on public.list_share_invites
  for select using (true);

-- list_items
create policy "list_items: accessible lists" on public.list_items
  for all using (list_id in (select public.accessible_list_ids()));

-- purchase_history
create policy "purchase_history: accessible lists" on public.purchase_history
  for select using (
    list_item_id in (
      select id from public.list_items
      where list_id in (select public.accessible_list_ids())
    )
  );
create policy "purchase_history: own inserts" on public.purchase_history
  for insert with check (purchased_by = auth.uid());

-- item_associations
create policy "item_associations: own" on public.item_associations
  for all using (user_id = auth.uid());

-- recipes
create policy "recipes: own" on public.recipes
  for all using (owner_id = auth.uid());

create policy "recipe_items: via recipe" on public.recipe_items
  for all using (
    recipe_id in (select id from public.recipes where owner_id = auth.uid())
  );

create policy "recipe_share_tokens: via recipe" on public.recipe_share_tokens
  for all using (
    recipe_id in (select id from public.recipes where owner_id = auth.uid())
  );
create policy "recipe_share_tokens: public read" on public.recipe_share_tokens
  for select using (true);

-- hjemmelager
create policy "hjemmelager: own" on public.hjemmelager
  for all using (user_id = auth.uid());

-- ai_enrichment_cache
create policy "ai_enrichment_cache: authenticated read" on public.ai_enrichment_cache
  for select using (auth.uid() is not null);
create policy "ai_enrichment_cache: authenticated write" on public.ai_enrichment_cache
  for insert with check (auth.uid() is not null);

-- ai_usage_log
create policy "ai_usage_log: own" on public.ai_usage_log
  for all using (user_id = auth.uid());

-- Callable from the app to seed default recipes for the current user.
create or replace function public.seed_my_recipes()
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  perform public.seed_default_recipes(auth.uid());
end;
$$;

-- ── Hva kan jeg lage? ────────────────────────────────────────
-- Scores user's recipes by non-staple ingredients in hjemmelager.
-- Returns top 3 by match score.

create or replace function public.suggest_recipes_from_hjemmelager()
returns table (
  id                 uuid,
  name               text,
  description        text,
  total_ingredients  bigint,
  available_count    bigint,
  missing_count      bigint,
  match_score        float,
  missing_items      text[]
)
language sql
stable
as $$
  select
    r.id,
    r.name,
    r.description,
    count(ri.id)                                                                as total_ingredients,
    count(h.id)                                                                 as available_count,
    count(ri.id) - count(h.id)                                                  as missing_count,
    count(h.id)::float / count(ri.id)                                           as match_score,
    array_agg(ri.item_name order by ri.sort_order) filter (where h.id is null) as missing_items
  from public.recipes r
  join public.recipe_items ri on ri.recipe_id = r.id
  left join public.hjemmelager h
    on  h.item_name_normalized = ri.item_name_normalized
    and h.user_id = auth.uid()
  where r.owner_id = auth.uid()
    and ri.is_pantry_staple = false
  group by r.id, r.name, r.description
  having count(ri.id) > 0
  order by match_score desc, available_count desc
  limit 3
$$;


-- ============================================================
-- LOCK DOWN HELPER FUNCTIONS TO AUTHENTICATED ROLE ONLY
-- ============================================================

revoke execute on function public.member_list_ids()     from anon, public;
revoke execute on function public.owned_list_ids()      from anon, public;
revoke execute on function public.accessible_list_ids() from anon, public;
revoke execute on function public.ai_within_rate_limit(text) from anon, public;

grant execute on function public.member_list_ids()     to authenticated;
grant execute on function public.owned_list_ids()      to authenticated;
grant execute on function public.accessible_list_ids() to authenticated;
grant execute on function public.ai_within_rate_limit(text) to authenticated;
grant execute on function public.suggest_recipes_from_hjemmelager() to authenticated;
