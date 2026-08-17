"use server";

import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { PlanWithExercises } from "@/types/database";

const PLAN_SELECT = `
  *,
  plan_exercises (
    id,
    plan_id,
    exercise_id,
    item_type,
    label,
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
`;

export async function getLatestPlanForCurrentPatient(): Promise<
  | { ok: true; plan: PlanWithExercises | null }
  | { ok: false; error: string }
> {
  const profile = await requireProfile(["patient"]);
  if (!profile) {
    return { ok: false, error: "No autorizado." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_SELECT)
    .eq("patient_id", profile.id)
    .order("created_at", { ascending: false })
    .order("order_index", {
      referencedTable: "plan_exercises",
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, plan: (data as PlanWithExercises | null) ?? null };
}
