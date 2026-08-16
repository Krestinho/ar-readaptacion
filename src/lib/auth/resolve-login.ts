"use server";

import {
  normalizeUsername,
  usernameToAuthEmail,
} from "@/lib/auth/username";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Devuelve emails de Auth a probar para un identificador de login.
 * Cubre usuario nuevo (dominio interno) y migraciones (p.ej. @gmail.com).
 */
export async function resolveAuthEmailsForLogin(
  identifier: string
): Promise<string[]> {
  const raw = identifier.trim().toLowerCase();
  if (!raw) return [];

  if (raw.includes("@")) {
    return [raw];
  }

  const username = normalizeUsername(raw);
  const emails = new Set<string>([
    usernameToAuthEmail(username),
    `${username}@gmail.com`,
  ]);

  try {
    const admin = createAdminClient();

    const { data: byUsername } = await admin
      .from("profiles")
      .select("id, username, full_name")
      .eq("username", username)
      .maybeSingle();

    let profileId = byUsername?.id ?? null;

    if (!profileId) {
      const { data: patients } = await admin
        .from("profiles")
        .select("id, username, full_name")
        .eq("role", "patient");

      const match = (patients ?? []).find((p) => {
        const full = (p.full_name ?? "").toLowerCase();
        return (
          p.username === username ||
          full === `${username}@gmail.com` ||
          full.startsWith(`${username}@`) ||
          full.includes(username)
        );
      });
      profileId = match?.id ?? null;
    }

    if (profileId) {
      const { data } = await admin.auth.admin.getUserById(profileId);
      if (data.user?.email) {
        emails.add(data.user.email.toLowerCase());
      }
    }

    const { data: listed } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    for (const user of listed?.users ?? []) {
      const email = user.email?.toLowerCase();
      if (!email) continue;
      if (email.startsWith(`${username}@`)) emails.add(email);
      if (user.user_metadata?.username === username) emails.add(email);
    }
  } catch {
    // Sin service role: nos quedamos con candidatos deterministas.
  }

  return Array.from(emails);
}
