"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ClipboardList,
  ClipboardPlus,
  Dumbbell,
  LayoutDashboard,
  Users,
  X,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: LayoutDashboard,
    isActive: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: "/dashboard/exercises",
    label: "Ejercicios",
    icon: Dumbbell,
    isActive: (pathname: string) => pathname.startsWith("/dashboard/exercises"),
  },
  {
    href: "/dashboard/patients",
    label: "Pacientes",
    icon: Users,
    isActive: (pathname: string) => pathname.startsWith("/dashboard/patients"),
  },
  {
    href: "/dashboard/plans",
    label: "Planes",
    icon: ClipboardList,
    isActive: (pathname: string) =>
      pathname === "/dashboard/plans" ||
      (pathname.startsWith("/dashboard/plans/") &&
        pathname !== "/dashboard/plans/new" &&
        !pathname.startsWith("/dashboard/plans/expiring")),
  },
  {
    href: "/dashboard/plans/expiring",
    label: "Caducidad",
    icon: AlertTriangle,
    isActive: (pathname: string) =>
      pathname.startsWith("/dashboard/plans/expiring"),
  },
  {
    href: "/dashboard/plans/new",
    label: "Crear Plan",
    icon: ClipboardPlus,
    isActive: (pathname: string) => pathname === "/dashboard/plans/new",
  },
] as const;

type DashboardSidebarProps = {
  className?: string;
  onNavigate?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
};

export function DashboardSidebar({
  className,
  onNavigate,
  showCloseButton = false,
  onClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 px-5 py-6">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Panel clínico
          </p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            AR Readaptación
          </h1>
        </div>
        {showCloseButton ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mt-0.5 shrink-0"
            onClick={onClose}
            aria-label="Cerrar menú"
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <Separator className="mb-3" />
        <SignOutButton className="w-full justify-start px-3" />
      </div>
    </aside>
  );
}
