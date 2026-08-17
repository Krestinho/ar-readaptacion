-- Grupo de ejercicio (NEURODINÁMIA, ANALÍTICOS · Tobillo, …)
-- Distinto de plan_exercises.block_name (A+M, PE, A1… en el plan del paciente).
-- Ejecutar en Supabase → SQL Editor

alter table public.exercises
  add column if not exists group_name text;

create index if not exists exercises_group_name_idx
  on public.exercises (group_name)
  where group_name is not null;

comment on column public.exercises.group_name is
  'Grupo clínico del ejercicio (NEURODINÁMIA, ANALÍTICOS · Tobillo, …). No confundir con el bloque del plan.';
