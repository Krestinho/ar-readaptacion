import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requireProfile } from "@/lib/auth/profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile(["admin"]);

  if (!profile) {
    redirect("/");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
