import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { PlanDocument } from "@/components/plans/plan-document";
import { requireProfile } from "@/lib/auth/profile";
import { getLatestPlanForCurrentPatient } from "@/lib/plans/patient";

export default async function PatientPlanPage() {
  const profile = await requireProfile(["patient"]);

  if (!profile) {
    redirect("/");
  }

  const result = await getLatestPlanForCurrentPatient();

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Área del paciente
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Mi plan</h1>
          <p className="mt-1 text-muted-foreground">
            Hola{profile.full_name ? `, ${profile.full_name}` : ""}.
          </p>
        </div>
        <SignOutButton />
      </header>

      {!result.ok ? (
        <p className="text-destructive">{result.error}</p>
      ) : !result.plan ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-muted-foreground">
          Todavía no tienes un plan asignado. Cuando tu fisioterapeuta lo cree,
          aparecerá aquí.
        </div>
      ) : (
        <PlanDocument
          plan={result.plan}
          patientName={profile.full_name}
          showExport
        />
      )}
    </div>
  );
}
