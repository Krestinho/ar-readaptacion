import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

export type AuthProfile = Pick<
  Profile,
  "id" | "role" | "full_name" | "username" | "is_active" | "must_change_password"
>;

/**
 * Devuelve el perfil del usuario autenticado, o null si no hay sesión / perfil.
 */
export async function getCurrentProfile(): Promise<AuthProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, username, is_active, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function requireProfile(allowedRoles?: UserRole[]) {
  const profile = await getCurrentProfile();

  if (!profile || !profile.is_active) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return null;
  }

  return profile;
}
