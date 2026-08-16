/**
 * Crea un usuario admin por username (Auth + profiles).
 * Uso: node scripts/create-admin.mjs fran.arcas "prueba1234" "Fran Arcas"
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env.local") });

const DOMAIN =
  process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || "ar-readaptacion.local";

function normalizeUsername(raw) {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.|\.$/g, "");
}

const username = normalizeUsername(process.argv[2] || "");
const password = process.argv[3] || "";
const fullName = (process.argv[4] || username).trim();

if (!username || !password) {
  console.error(
    'Uso: node scripts/create-admin.mjs <usuario> <password> ["Nombre"]'
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres.");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey || serviceKey.length < 40) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `${username}@${DOMAIN}`;

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    role: "admin",
    full_name: fullName,
    username,
    must_change_password: true,
  },
});

if (error) {
  console.error("Error Auth:", error.message);
  process.exit(1);
}

const userId = data.user?.id;
if (!userId) {
  console.error("No se obtuvo id de usuario.");
  process.exit(1);
}

const { error: profileError } = await admin.from("profiles").upsert({
  id: userId,
  role: "admin",
  full_name: fullName,
  username,
  must_change_password: true,
  is_active: true,
});

if (profileError) {
  console.error("Error profiles:", profileError.message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      username,
      email,
      fullName,
      must_change_password: true,
      id: userId,
    },
    null,
    2
  )
);
