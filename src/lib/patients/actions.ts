"use server";

import { revalidatePath } from "next/cache";

import {
  isValidUsername,
  normalizeUsername,
  usernameToAuthEmail,
} from "@/lib/auth/username";
import { requireProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export type PatientRow = Profile;

export type PatientActionResult =
  | { ok: true; username?: string }
  | { ok: false; error: string };

async function requireAdmin() {
  const profile = await requireProfile(["admin"]);
  if (!profile) {
    return { ok: false as const, error: "No autorizado." };
  }
  return { ok: true as const, profile };
}

export async function listPatients(): Promise<
  { ok: true; patients: PatientRow[] } | { ok: false; error: string }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "patient")
    .order("full_name", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, patients: profiles ?? [] };
}

export async function createPatient(
  formData: FormData
): Promise<PatientActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!fullName) {
    return { ok: false, error: "El nombre es obligatorio." };
  }
  if (!isValidUsername(username)) {
    return {
      ok: false,
      error:
        "Usuario inválido. Usa el formato nombre.apellido (solo letras, números y puntos).",
    };
  }
  if (password.length < 8) {
    return {
      ok: false,
      error: "La contraseña provisional debe tener al menos 8 caracteres.",
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local para poder crear usuarios.",
    };
  }

  const authEmail = usernameToAuthEmail(username);

  const { data, error } = await admin.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: {
      role: "patient",
      full_name: fullName,
      username,
      must_change_password: true,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { ok: false, error: "Ese nombre de usuario ya existe." };
    }
    return { ok: false, error: error.message };
  }

  if (data.user?.id) {
    const { error: profileError } = await admin.from("profiles").upsert({
      id: data.user.id,
      role: "patient",
      full_name: fullName,
      username,
      must_change_password: true,
      is_active: true,
    });

    if (profileError) {
      return { ok: false, error: profileError.message };
    }
  }

  revalidatePath("/dashboard/patients");
  return { ok: true, username };
}

/** Adapta pepe.perez@gmail.com (u otro paciente) al patrón username. */
export async function migratePatientToUsername(
  formData: FormData
): Promise<PatientActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const patientId = String(formData.get("patient_id") ?? "").trim();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const fullName = String(formData.get("full_name") ?? "").trim();
  const provisionalPassword = String(formData.get("password") ?? "");

  if (!patientId) return { ok: false, error: "Paciente no válido." };
  if (!isValidUsername(username)) {
    return { ok: false, error: "Usuario inválido (formato nombre.apellido)." };
  }
  if (provisionalPassword.length < 8) {
    return {
      ok: false,
      error: "Indica una contraseña provisional de al menos 8 caracteres.",
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local.",
    };
  }

  const authEmail = usernameToAuthEmail(username);

  // Primero password + metadata (siempre). Luego email sintético.
  const { error: passwordError } = await admin.auth.admin.updateUserById(
    patientId,
    {
      password: provisionalPassword,
      email_confirm: true,
      user_metadata: {
        role: "patient",
        full_name: fullName || username,
        username,
        must_change_password: true,
      },
    }
  );

  if (passwordError) {
    return { ok: false, error: passwordError.message };
  }

  const { data: currentUser } = await admin.auth.admin.getUserById(patientId);
  const currentEmail = currentUser.user?.email?.toLowerCase() ?? "";

  if (currentEmail !== authEmail) {
    const { error: emailError } = await admin.auth.admin.updateUserById(
      patientId,
      { email: authEmail, email_confirm: true }
    );

    if (emailError) {
      // Si el email sintético choca, dejamos el actual y el login probará ambos.
      console.warn(
        "[migratePatientToUsername] email update skipped:",
        emailError.message
      );
    }
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      username,
      full_name: fullName || "Pepe Pérez",
      must_change_password: true,
      role: "patient",
      is_active: true,
    })
    .eq("id", patientId);

  if (profileError) {
    return {
      ok: false,
      error: profileError.message.includes("username")
        ? "Falta ejecutar supabase/migrations/004_username_auth.sql en el SQL Editor de Supabase."
        : profileError.message,
    };
  }

  revalidatePath("/dashboard/patients");
  return { ok: true, username };
}

export async function setPatientActive(
  patientId: string,
  isActive: boolean
): Promise<PatientActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  if (!patientId) {
    return { ok: false, error: "Paciente no válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", patientId)
    .eq("role", "patient");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/patients");
  return { ok: true };
}
