import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/profile";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (profile?.is_active) {
    if (profile.must_change_password) {
      redirect("/auth/update-password");
    }
    redirect(profile.role === "admin" ? "/dashboard" : "/plan");
  }

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(166,124,82,0.12),_transparent_55%),linear-gradient(180deg,#f7f4ef_0%,#efe8df_100%)]"
      />

      <Card className="relative z-10 w-full max-w-md border-border/70 bg-card/95 shadow-sm backdrop-blur">
        <CardHeader className="items-center space-y-4 px-4 pb-2 text-center sm:px-6">
          <div className="flex w-full justify-center pt-2">
            <Image
              src="/logo.jpg"
              alt="Logo de la Clínica"
              width={250}
              height={100}
              priority
              className="h-auto w-full max-w-[250px] object-contain"
            />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-xl tracking-tight">
              Acceso a la plataforma
            </CardTitle>
            <CardDescription>
              Introduce las credenciales que te ha facilitado la clínica
              (usuario y contraseña).
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-4 pt-2 sm:px-6">
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
