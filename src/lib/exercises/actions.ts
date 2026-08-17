"use server";

import { revalidatePath } from "next/cache";

import seedExercises from "@/data/exercises-seed.json";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/types/database";

export type ExerciseActionResult =
  | { ok: true; count?: number }
  | { ok: false; error: string };

async function requireAdmin() {
  const profile = await requireProfile(["admin"]);
  if (!profile) {
    return { ok: false as const, error: "No autorizado." };
  }
  return { ok: true as const, profile };
}

function cleanOptional(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function createExercise(
  formData: FormData
): Promise<ExerciseActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { ok: false, error: "El título es obligatorio." };
  }

  const payload: TablesInsert<"exercises"> = {
    code: cleanOptional(formData.get("code")),
    title,
    group_name: cleanOptional(formData.get("group_name")),
    description: cleanOptional(formData.get("description")),
    video_url: cleanOptional(formData.get("video_url")),
  };

  const supabase = await createClient();
  const { error } = await supabase.from("exercises").insert(payload);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ese identificador ya existe." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/exercises");
  return { ok: true };
}

export async function updateExercise(
  id: string,
  formData: FormData
): Promise<ExerciseActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (!id) {
    return { ok: false, error: "Ejercicio no válido." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { ok: false, error: "El título es obligatorio." };
  }

  const payload: TablesUpdate<"exercises"> = {
    code: cleanOptional(formData.get("code")),
    title,
    group_name: cleanOptional(formData.get("group_name")),
    description: cleanOptional(formData.get("description")),
    video_url: cleanOptional(formData.get("video_url")),
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("exercises")
    .update(payload)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Ese identificador ya existe." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/exercises");
  return { ok: true };
}

/**
 * Importa la carga inicial parseada del PDF (src/data/exercises-seed.json).
 * Omite códigos que ya existan.
 */
export async function importSeedExercises(): Promise<ExerciseActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("exercises")
    .select("code")
    .not("code", "is", null);

  if (existingError) {
    return { ok: false, error: existingError.message };
  }

  const existingCodes = new Set(
    (existing ?? []).map((row) => row.code).filter(Boolean)
  );

  const toInsert = (seedExercises as TablesInsert<"exercises">[]).filter(
    (row) => row.code && !existingCodes.has(row.code)
  );

  if (toInsert.length === 0) {
    return { ok: true, count: 0 };
  }

  const batchSize = 40;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabase.from("exercises").insert(batch);
    if (error) {
      return {
        ok: false,
        error: `Error al insertar (lote ${i / batchSize + 1}): ${error.message}`,
      };
    }
    inserted += batch.length;
  }

  revalidatePath("/dashboard/exercises");
  return { ok: true, count: inserted };
}

export async function getExerciseGroupOptions(): Promise<string[]> {
  const auth = await requireAdmin();
  if (!auth.ok) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("group_name")
    .not("group_name", "is", null);

  if (error) return [];

  const { buildGroupSelectOptions } = await import("@/lib/exercises/groups");
  return buildGroupSelectOptions((data ?? []).map((row) => row.group_name));
}
