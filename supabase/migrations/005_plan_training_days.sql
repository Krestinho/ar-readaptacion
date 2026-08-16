-- Días de entrenamiento del plan + bloque (columna Bloque del PDF)
-- Ejecutar en Supabase → SQL Editor

alter table public.plans
  add column if not exists training_days date[] not null default '{}';

alter table public.plan_exercises
  add column if not exists block_name text;

comment on column public.plans.training_days is
  'Fechas concretas del rango en las que el paciente entrena (marcadas en la portada del PDF).';

comment on column public.plan_exercises.block_name is
  'Etiqueta de bloque del PDF (A+M, PE, A1, B2, …).';
