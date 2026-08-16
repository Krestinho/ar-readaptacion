-- Identificador editable de ejercicios (para búsqueda / CSV)
-- Ejecutar en Supabase → SQL Editor

alter table public.exercises
  add column if not exists code text;

create unique index if not exists exercises_code_unique_idx
  on public.exercises (code)
  where code is not null;

create index if not exists exercises_code_idx
  on public.exercises (code);
