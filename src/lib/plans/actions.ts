"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth/profile";
import { addDaysISO, compareISODate, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { PlanWithExercises } from "@/types/database";

export type PlanActionResult =
  | { ok: true; planId?: string }
  | { ok: false; error: string };

export type PlanPatientOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

export type PlanExerciseOption = {
  id: string;
  code: string | null;
  title: string;
};

export type PlanExerciseInput = {
  exercise_id: string;
  custom_instructions: string | null;
  section_name: string | null;
  block_name: string | null;
  order_index: number;
};

export type SavePlanInput = {
  planId?: string;
  patient_id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  training_days: string[];
  exercises: PlanExerciseInput[];
};

async function requireAdmin() {
  const profile = await requireProfile(["admin"]);
  if (!profile) {
    return { ok: false as const, error: "No autorizado." };
  }
  return { ok: true as const, profile };
}

function cleanOptionalText(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getPlanBuilderOptions(): Promise<
  | {
      ok: true;
      patients: PlanPatientOption[];
      exercises: PlanExerciseOption[];
    }
  | { ok: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();

  const [{ data: patients, error: patientsError }, { data: exercises, error: exercisesError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "patient")
        .eq("is_active", true)
        .order("full_name", { ascending: true }),
      supabase
        .from("exercises")
        .select("id, code, title")
        .order("title", { ascending: true }),
    ]);

  if (patientsError) return { ok: false, error: patientsError.message };
  if (exercisesError) return { ok: false, error: exercisesError.message };

  return {
    ok: true,
    patients: (patients ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: null,
    })),
    exercises: exercises ?? [],
  };
}

export async function getPlanById(
  planId: string
): Promise<
  { ok: true; plan: PlanWithExercises } | { ok: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(
      `
      *,
      plan_exercises (
        id,
        plan_id,
        exercise_id,
        custom_instructions,
        section_name,
        block_name,
        order_index,
        exercises (
          id,
          code,
          title,
          description,
          video_url
        )
      )
    `
    )
    .eq("id", planId)
    .order("order_index", { referencedTable: "plan_exercises", ascending: true })
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Plan no encontrado." };

  return { ok: true, plan: data as PlanWithExercises };
}

export async function listPlans(): Promise<
  | {
      ok: true;
      plans: Array<{
        id: string;
        title: string;
        start_date: string | null;
        end_date: string | null;
        created_at: string;
        patient_id: string;
        patient_name: string | null;
      }>;
    }
  | { ok: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const [{ data: plans, error }, { data: profiles }] = await Promise.all([
    supabase
      .from("plans")
      .select("id, title, start_date, end_date, created_at, patient_id")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "patient"),
  ]);

  if (error) return { ok: false, error: error.message };

  const nameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.full_name])
  );

  return {
    ok: true,
    plans: (plans ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      start_date: row.start_date,
      end_date: row.end_date,
      created_at: row.created_at,
      patient_id: row.patient_id,
      patient_name: nameById.get(row.patient_id) ?? null,
    })),
  };
}

export async function savePlan(input: SavePlanInput): Promise<PlanActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const title = input.title.trim();
  if (!title) return { ok: false, error: "El título del plan es obligatorio." };
  if (!input.patient_id) {
    return { ok: false, error: "Selecciona un paciente." };
  }
  if (!input.exercises.length) {
    return { ok: false, error: "Añade al menos un ejercicio al plan." };
  }

  const supabase = await createClient();
  const planPayload = {
    patient_id: input.patient_id,
    title,
    start_date: cleanOptionalText(input.start_date),
    end_date: cleanOptionalText(input.end_date),
    training_days: (input.training_days ?? []).filter(Boolean).sort(),
  };

  let planId = input.planId;

  if (planId) {
    const { error } = await supabase
      .from("plans")
      .update(planPayload)
      .eq("id", planId);
    if (error) return { ok: false, error: error.message };

    const { error: deleteError } = await supabase
      .from("plan_exercises")
      .delete()
      .eq("plan_id", planId);
    if (deleteError) return { ok: false, error: deleteError.message };
  } else {
    const { data, error } = await supabase
      .from("plans")
      .insert(planPayload)
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, error: error?.message ?? "No se pudo crear el plan." };
    }
    planId = data.id;
  }

  const rows = input.exercises.map((item, index) => ({
    plan_id: planId!,
    exercise_id: item.exercise_id,
    custom_instructions: cleanOptionalText(item.custom_instructions),
    section_name: cleanOptionalText(item.section_name),
    block_name: cleanOptionalText(item.block_name),
    order_index: index,
  }));

  const { error: insertError } = await supabase
    .from("plan_exercises")
    .insert(rows);

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  revalidatePath("/dashboard/plans");
  revalidatePath("/dashboard/plans/expiring");
  revalidatePath(`/dashboard/plans/${planId}`);
  revalidatePath("/dashboard/plans/new");
  revalidatePath("/plan");

  return { ok: true, planId };
}

export async function savePlanAndRedirect(input: SavePlanInput) {
  const result = await savePlan(input);
  if (!result.ok || !result.planId) {
    return result;
  }
  redirect(`/dashboard/plans/${result.planId}`);
}

export async function getLatestPlanForPatient(
  patientId: string
): Promise<
  { ok: true; plan: PlanWithExercises | null } | { ok: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (!patientId) {
    return { ok: false, error: "Paciente no válido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(
      `
      *,
      plan_exercises (
        id,
        plan_id,
        exercise_id,
        custom_instructions,
        section_name,
        block_name,
        order_index,
        exercises (
          id,
          code,
          title,
          description,
          video_url
        )
      )
    `
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .order("order_index", {
      referencedTable: "plan_exercises",
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, plan: (data as PlanWithExercises | null) ?? null };
}

export type ExpiringPlanRow = {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string;
  patient_id: string;
  patient_name: string | null;
  status: "expired" | "expiring_soon";
  daysOffset: number;
};

export async function listExpiringPlans(): Promise<
  { ok: true; plans: ExpiringPlanRow[] } | { ok: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const [{ data: plans, error }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase
        .from("plans")
        .select("id, title, start_date, end_date, patient_id")
        .not("end_date", "is", null)
        .order("end_date", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, is_active")
        .eq("role", "patient"),
    ]);

  if (error) return { ok: false, error: error.message };
  if (profilesError) return { ok: false, error: profilesError.message };

  const today = todayISO();
  const limit = addDaysISO(today, 3);

  const activePatients = new Map(
    (profiles ?? [])
      .filter((p) => p.is_active)
      .map((p) => [p.id, p.full_name] as const)
  );

  const result: ExpiringPlanRow[] = [];

  for (const plan of plans ?? []) {
    if (!plan.end_date) continue;
    if (!activePatients.has(plan.patient_id)) continue;
    if (compareISODate(plan.end_date, limit) > 0) continue;

    const daysOffset = Math.round(
      (new Date(plan.end_date + "T00:00:00").getTime() -
        new Date(today + "T00:00:00").getTime()) /
        (1000 * 60 * 60 * 24)
    );

    result.push({
      id: plan.id,
      title: plan.title,
      start_date: plan.start_date,
      end_date: plan.end_date,
      patient_id: plan.patient_id,
      patient_name: activePatients.get(plan.patient_id) ?? null,
      status: daysOffset < 0 ? "expired" : "expiring_soon",
      daysOffset,
    });
  }

  result.sort((a, b) => compareISODate(a.end_date, b.end_date));
  return { ok: true, plans: result };
}

export async function updatePlanEndDate(
  planId: string,
  endDate: string
): Promise<PlanActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const cleaned = cleanOptionalText(endDate);
  if (!cleaned) {
    return { ok: false, error: "La fecha de fin es obligatoria." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({ end_date: cleaned })
    .eq("id", planId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/plans");
  revalidatePath("/dashboard/plans/expiring");
  revalidatePath(`/dashboard/plans/${planId}`);
  revalidatePath("/plan");
  return { ok: true, planId };
}

export async function deletePlan(planId: string): Promise<PlanActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("plans").delete().eq("id", planId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/plans");
  return { ok: true };
}
