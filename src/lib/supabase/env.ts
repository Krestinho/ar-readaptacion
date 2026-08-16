function missing(name: string): never {
  throw new Error(
    `Falta la variable de entorno ${name}. Revisa tu archivo .env.local.`
  );
}

/**
 * Importante: en el cliente, Next solo inyecta env si se leen con acceso estático
 * (process.env.NEXT_PUBLIC_...), no con process.env[name].
 */
export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) missing("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return { url, anonKey };
}

/** Solo server — invitaciones y operaciones privilegiadas */
export function getSupabaseServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) missing("SUPABASE_SERVICE_ROLE_KEY");

  const looksPlaceholder =
    serviceRoleKey.length < 40 ||
    /your_service_role|example|changeme|tu_service/i.test(serviceRoleKey);

  if (looksPlaceholder) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no es válida. En Supabase → Project Settings → API copia la clave service_role (secreta) a .env.local y reinicia npm run dev."
    );
  }

  return serviceRoleKey;
}
