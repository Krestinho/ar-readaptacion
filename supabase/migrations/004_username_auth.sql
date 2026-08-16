-- Usuarios por username + primer acceso con cambio de contraseña
-- Ejecutar en Supabase → SQL Editor

alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username)
  where username is not null;

-- Trigger: al crear usuario en Auth, guardar username y flag de primer acceso
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, username, must_change_password, is_active)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'patient'),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    nullif(lower(trim(new.raw_user_meta_data->>'username')), ''),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false),
    true
  )
  on conflict (id) do update set
    role = excluded.role,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    username = coalesce(excluded.username, public.profiles.username),
    must_change_password = excluded.must_change_password;
  return new;
end;
$$;

-- El paciente puede limpiar el flag tras cambiar la contraseña
create or replace function public.clear_must_change_password()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set must_change_password = false,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.clear_must_change_password() from public;
grant execute on function public.clear_must_change_password() to authenticated;

-- Migración del paciente de prueba pepe.perez@gmail.com → username pepe.perez
update public.profiles p
set
  username = 'pepe.perez',
  full_name = case
    when p.full_name is null
      or p.full_name ilike '%@%'
      or p.full_name ilike 'pepe.perez%'
    then 'Pepe Pérez'
    else p.full_name
  end,
  must_change_password = true,
  updated_at = now()
where p.role = 'patient'
  and (
    p.full_name ilike '%pepe.perez%'
    or p.username = 'pepe.perez'
    or exists (
      select 1
      from auth.users u
      where u.id = p.id
        and lower(u.email) in ('pepe.perez@gmail.com', 'pepe.perez@ar-readaptacion.local')
    )
  );
