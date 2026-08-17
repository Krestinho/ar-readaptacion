-- Separadores de texto dentro del plan (sin ejercicio asociado)
-- Ejecutar en Supabase → SQL Editor

alter table public.plan_exercises
  add column if not exists item_type text not null default 'exercise';

alter table public.plan_exercises
  add column if not exists label text;

alter table public.plan_exercises
  alter column exercise_id drop not null;

alter table public.plan_exercises
  drop constraint if exists plan_exercises_item_type_check;

alter table public.plan_exercises
  add constraint plan_exercises_item_type_check
  check (item_type in ('exercise', 'separator'));

alter table public.plan_exercises
  drop constraint if exists plan_exercises_item_shape_check;

alter table public.plan_exercises
  add constraint plan_exercises_item_shape_check
  check (
    (item_type = 'exercise' and exercise_id is not null)
    or (item_type = 'separator' and label is not null and length(trim(label)) > 0)
  );

comment on column public.plan_exercises.item_type is
  'exercise = fila normal; separator = texto separador dentro del día/grupo.';

comment on column public.plan_exercises.label is
  'Texto del separador cuando item_type = separator.';
