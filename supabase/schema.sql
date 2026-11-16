-- RUTA · esquema de base de datos
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr más de una vez.
-- Cada fila pertenece a quien la crea (user_id) y solo esa persona la ve.

-- ───────────── áreas de la rueda ─────────────
create table if not exists areas (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  key        text not null,
  score      smallint not null default 0 check (score between 0 and 10),
  goal       text default '',
  note       text default '',
  photo      text default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- ───────────── días: hábitos y "día distinto" ─────────────
create table if not exists days (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  day        date not null,
  habits     jsonb not null default '{}'::jsonb,   -- {"paseo":true,"bloque":false,...}
  kind       text not null default 'normal' check (kind in ('normal','distinto')),
  note       text default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- ───────────── tareas y agenda ─────────────
create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  title      text not null,
  starts_at  timestamptz,
  all_day    boolean not null default false,
  urgency    smallint not null default 1 check (urgency between 0 and 3), -- 0 baja · 3 urgente
  area       text,
  done       boolean not null default false,
  source     text not null default 'app' check (source in ('app','telegram')),
  created_at timestamptz not null default now()
);

-- ───────────── sueños: metas grandes y chicas ─────────────
create table if not exists goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  parent_id  uuid references goals(id) on delete cascade,  -- meta chica cuelga de una grande
  title      text not null,
  kind       text not null default 'micro' check (kind in ('macro','micro')),
  area       text,
  due        date,
  photo      text default '',
  pinned     boolean not null default false,
  done       boolean not null default false,
  done_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────── capital: ahorro, ingresos, metas logradas ─────────────
create table if not exists money (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  kind       text not null check (kind in ('ahorro','ingreso')),
  amount     numeric(14,2) not null,
  currency   text not null default 'CLP',
  day        date not null default current_date,
  note       text default '',
  created_at timestamptz not null default now()
);

-- ───────────── historial de pegas ─────────────
create table if not exists jobs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  client     text not null,
  project    text not null,
  amount     numeric(14,2),
  status     text not null default 'en curso' check (status in ('en curso','entregado','pagado')),
  day        date not null default current_date,
  created_at timestamptz not null default now()
);

-- ───────────── personas y recuerdos ─────────────
create table if not exists people (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  name       text not null,
  relation   text default '',
  birthday   date,
  photo      text default '',
  created_at timestamptz not null default now()
);

create table if not exists memories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  day        date not null default current_date,
  title      text default '',
  body       text default '',
  photo      text default '',
  person_id  uuid references people(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ───────────── diario ─────────────
create table if not exists journal (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  day        date not null default current_date,
  body       text not null,
  source     text not null default 'app' check (source in ('app','telegram')),
  created_at timestamptz not null default now()
);

-- ───────────── ajustes (chat de Telegram, etc.) ─────────────
create table if not exists settings (
  user_id    uuid primary key default auth.uid() references auth.users on delete cascade,
  telegram_chat_id bigint,
  prefs      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ───────────── seguridad: cada uno ve solo lo suyo ─────────────
do $$
declare t text;
begin
  foreach t in array array['areas','days','tasks','goals','money','jobs','people','memories','journal','settings']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "solo el dueño" on %I', t);
    execute format('create policy "solo el dueño" on %I for all to authenticated
                    using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- ───────────── fotos: bucket privado, cada uno en su carpeta ─────────────
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "fotos propias: leer"   on storage.objects;
drop policy if exists "fotos propias: subir"  on storage.objects;
drop policy if exists "fotos propias: borrar" on storage.objects;

create policy "fotos propias: leer" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos propias: subir" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fotos propias: borrar" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
