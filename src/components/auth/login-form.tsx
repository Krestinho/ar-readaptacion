"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveAuthEmailsForLogin } from "@/lib/auth/resolve-login";
import { identifierToAuthEmail } from "@/lib/auth/username";
import { createClient } from "@/lib/supabase/client";

type LoginProfile = {
  role: "admin" | "patient";
  is_active: boolean;
  must_change_password?: boolean | null;
};

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadProfile(
    supabase: ReturnType<typeof createClient>,
    userId: string
  ): Promise<{ profile: LoginProfile | null; errorMessage: string | null }> {
    const withFlag = await supabase
      .from("profiles")
      .select("role, is_active, must_change_password")
      .eq("id", userId)
      .single();

    if (!withFlag.error && withFlag.data) {
      return { profile: withFlag.data as LoginProfile, errorMessage: null };
    }

    const msg = withFlag.error?.message ?? "";
    if (msg.includes("must_change_password") || msg.includes("username")) {
      const fallback = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", userId)
        .single();

      if (!fallback.error && fallback.data) {
        return {
          profile: { ...fallback.data, must_change_password: false },
          errorMessage: null,
        };
      }

      return {
        profile: null,
        errorMessage:
          "Falta ejecutar supabase/migrations/004_username_auth.sql en el SQL Editor de Supabase.",
      };
    }

    return {
      profile: null,
      errorMessage: msg || "No se encontró el perfil de usuario.",
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const trimmed = identifier.trim();

      let emails = await resolveAuthEmailsForLogin(trimmed);
      if (emails.length === 0) {
        emails = [identifierToAuthEmail(trimmed)];
      }

      let lastError: string | null = null;
      let signedInUserId: string | null = null;

      for (const email of emails) {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (!signInError && data.user?.id) {
          signedInUserId = data.user.id;
          break;
        }

        lastError = signInError?.message ?? "Invalid login credentials";
      }

      if (!signedInUserId) {
        const isEmailLogin = trimmed.includes("@");
        setError(
          lastError === "Invalid login credentials"
            ? isEmailLogin
              ? "Email o contraseña incorrectos."
              : "Usuario o contraseña incorrectos. Si acabas de crear el usuario, desde admin usa «Resetear acceso» y vuelve a probar."
            : lastError
        );
        return;
      }

      const { profile, errorMessage } = await loadProfile(
        supabase,
        signedInUserId
      );

      if (!profile) {
        await supabase.auth.signOut();
        setError(errorMessage ?? "No se encontró el perfil de usuario.");
        return;
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        setError("Tu cuenta está deshabilitada. Contacta con la clínica.");
        return;
      }

      if (profile.must_change_password) {
        router.replace("/auth/update-password");
        router.refresh();
        return;
      }

      if (profile.role === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/plan");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ha ocurrido un error inesperado. Inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">Usuario o email</Label>
        <Input
          id="identifier"
          type="text"
          autoComplete="username"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="admin@email.com o nombre.apellido"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Admin: usa tu email. Pacientes: usuario tipo nombre.apellido.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          disabled={loading}
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
        {loading ? "Entrando…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
