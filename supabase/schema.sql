-- SAI Universe — backend schema (TZ §51–55). Target: Supabase / PostgreSQL.
-- The MVP client stores progress in localStorage (src/store/gameStore.ts);
-- these tables are the server-side shape of the same data.

create table users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Sai Explorer',
  level int not null default 1,
  xp int not null default 0,
  current_city text,
  created_at timestamptz not null default now()
);

create table wallets (
  address text primary key,
  user_id uuid not null references users(id) on delete cascade,
  chain text not null default 'ethereum',
  verified_at timestamptz
);

-- Filled by an indexer / edge function after wallet signature check.
create table owned_nfts (
  wallet text not null references wallets(address) on delete cascade,
  collection text not null,           -- e.g. 'sai-city-rio'
  token_id text not null,
  refreshed_at timestamptz not null default now(),
  primary key (wallet, collection, token_id)
);

create table cities (
  id text primary key,                -- 'rio'
  name text not null,
  country text not null,
  requires_nft boolean not null default true,
  visitor_access boolean not null default true,
  scene text,
  status text not null default 'soon' -- 'open' | 'soon'
);

create table city_access (
  user_id uuid references users(id) on delete cascade,
  city_id text references cities(id),
  level text not null check (level in ('full', 'visitor', 'locked')),
  source text not null default 'nft',
  primary key (user_id, city_id)
);

create table player_progress (
  user_id uuid references users(id) on delete cascade,
  city_id text references cities(id),
  city_xp int not null default 0,
  flags jsonb not null default '{}',
  collected jsonb not null default '{}',
  fast_travel text[] not null default '{}',
  primary key (user_id, city_id)
);

-- Quests are data (TZ §54), mirrored from src/data/quests.ts.
create table quests (
  id text primary key,
  city_id text references cities(id),
  type text not null,
  title text not null,
  definition jsonb not null,          -- objectives, reward, requirements
  repeat text check (repeat in ('daily', 'weekly'))
);

create table quest_progress (
  user_id uuid references users(id) on delete cascade,
  quest_id text references quests(id),
  status text not null check (status in ('active', 'completed')),
  step int not null default 0,
  count int not null default 0,
  period date,                        -- for daily / weekly resets
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

create table currencies (
  user_id uuid primary key references users(id) on delete cascade,
  sai_energy int not null default 0 check (sai_energy >= 0)
);

create table inventory (
  user_id uuid references users(id) on delete cascade,
  item_id text not null,
  qty int not null default 1 check (qty >= 0),
  primary key (user_id, item_id)
);

create table rooms (
  user_id uuid references users(id) on delete cascade,
  city_id text references cities(id),
  level int not null default 1,
  primary key (user_id, city_id)
);

create table room_items (
  user_id uuid references users(id) on delete cascade,
  city_id text references cities(id),
  slot text not null,                 -- 's1'…'s7', 't1'…'t3'
  item_id text not null,
  rotation int not null default 0,
  primary key (user_id, city_id, slot)
);

create table cosmetics (
  user_id uuid references users(id) on delete cascade,
  cosmetic_id text not null,
  equipped boolean not null default false,
  primary key (user_id, cosmetic_id)
);

create table pets (
  user_id uuid references users(id) on delete cascade,
  pet_id text not null,
  equipped boolean not null default false,
  primary key (user_id, pet_id)
);

create table vehicles (
  user_id uuid references users(id) on delete cascade,
  vehicle_id text not null,
  skin text,
  primary key (user_id, vehicle_id)
);

create table achievements (
  user_id uuid references users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table passport (
  user_id uuid references users(id) on delete cascade,
  city_id text references cities(id),
  stamp_at timestamptz,
  percent int not null default 0,
  primary key (user_id, city_id)
);

create table events (
  id text primary key,                -- 'sai-fest-rio'
  city_id text references cities(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  config jsonb not null default '{}'
);

-- Community progress (TZ §40): sum of contributions unlocks new zones.
create table community_progress (
  city_id text primary key references cities(id),
  energy_collected bigint not null default 0,
  goal bigint not null default 1000000
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  sku text not null,
  price_energy int,
  price_fiat_cents int,
  created_at timestamptz not null default now()
);
