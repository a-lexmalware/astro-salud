-- Ejecuta esto en Supabase: SQL Editor > New query > Run.

create table if not exists public.lecturas (
  id bigint generated always as identity primary key,
  astronauta_id text not null,
  fc integer not null,
  spo2 integer not null,
  temp numeric(4,1) not null,
  hrv integer not null,
  sueno numeric(3,1) not null,
  ejercicio integer not null,
  creado_en timestamptz not null default now()
);

create index if not exists lecturas_astronauta_fecha
  on public.lecturas (astronauta_id, creado_en desc);

-- Escenario activo por astronauta: lo escribe el panel y lo lee el simulador.
create table if not exists public.escenarios (
  astronauta_id text primary key,
  escenario text not null default 'normal',
  actualizado_en timestamptz not null default now()
);

alter table public.lecturas enable row level security;
alter table public.escenarios enable row level security;

-- Políticas abiertas, SOLO para la demo del hackathon.
-- En un sistema real: autenticación y acceso por rol (astronauta, médico de vuelo).
-- Cada política se borra antes de crearse para poder ejecutar el archivo más de una vez.
drop policy if exists "demo leer lecturas" on public.lecturas;
create policy "demo leer lecturas" on public.lecturas for select to anon using (true);
drop policy if exists "demo insertar lecturas" on public.lecturas;
create policy "demo insertar lecturas" on public.lecturas for insert to anon with check (true);
drop policy if exists "demo leer escenarios" on public.escenarios;
create policy "demo leer escenarios" on public.escenarios for select to anon using (true);
drop policy if exists "demo insertar escenarios" on public.escenarios;
create policy "demo insertar escenarios" on public.escenarios for insert to anon with check (true);
drop policy if exists "demo actualizar escenarios" on public.escenarios;
create policy "demo actualizar escenarios" on public.escenarios for update to anon using (true) with check (true);

-- Retención: en cada inserción se borran las lecturas de más de una hora, para que
-- la tabla no crezca sin límite. Es "security definer" porque anon no puede borrar.
create or replace function public.limpiar_lecturas() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.lecturas where creado_en < now() - interval '1 hour';
  return null;
end $$;

drop trigger if exists limpiar_lecturas on public.lecturas;
create trigger limpiar_lecturas after insert on public.lecturas
  for each statement execute function public.limpiar_lecturas();

-- Activa Realtime (solo si aún no está activo): lecturas en vivo y escenarios
-- sincronizados entre paneles.
do $$
declare
  t text;
begin
  foreach t in array array['lecturas', 'escenarios'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
