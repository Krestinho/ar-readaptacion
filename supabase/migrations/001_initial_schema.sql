-- Copia del esquema inicial (referencia). Ejecutar en Supabase SQL Editor si hace falta recrear.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('admin', 'patient');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'patient',
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  video_url text,
  created_at timestamptz not null default now()
);

create index exercises_title_idx on public.exercises (title);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create index plans_patient_id_idx on public.plans (patient_id);
create index plans_created_at_idx on public.plans (created_at desc);

create table public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  custom_instructions text,
  section_name text,
  order_index integer not null default 0
);

create index plan_exercises_plan_id_idx on public.plan_exercises (plan_id);
create index plan_exercises_order_idx on public.plan_exercises (plan_id, order_index);
