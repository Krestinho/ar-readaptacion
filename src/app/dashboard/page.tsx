import Link from "next/link";
import {
  AlertTriangle,
  ClipboardList,
  ClipboardPlus,
  Dumbbell,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const quickLinks = [
  {
    href: "/dashboard/exercises",
    label: "Ejercicios",
    description: "Biblioteca y carga inicial",
    icon: Dumbbell,
  },
  {
    href: "/dashboard/patients",
    label: "Pacientes",
    description: "Altas y acceso",
    icon: Users,
  },
  {
    href: "/dashboard/plans",
    label: "Planes",
    description: "Ver y editar planes",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/plans/new",
    label: "Crear plan",
    description: "Nuevo plan de rehab",
    icon: ClipboardPlus,
  },
  {
    href: "/dashboard/plans/expiring",
    label: "Caducidad",
    description: "Planes por vencer",
    icon: AlertTriangle,
  },
] as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Bienvenido al panel de administración. Accede rápido a las secciones
          principales.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {quickLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto min-h-20 flex-col items-start gap-2 whitespace-normal p-4 text-left"
              )}
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <Icon className="size-4 shrink-0 text-[#a67c52]" />
                {item.label}
              </span>
              <span className="text-sm font-normal text-muted-foreground break-words">
                {item.description}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
