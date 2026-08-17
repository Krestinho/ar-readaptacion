import Link from "next/link";

import { PlanBuilder } from "@/components/plans/plan-builder";
import { PlanDocument } from "@/components/plans/plan-document";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getPlanBuilderOptions,
  getPlanById,
} from "@/lib/plans/actions";
import { cn } from "@/lib/utils";

type EditPlanPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPlanPage({ params }: EditPlanPageProps) {
  const { id } = await params;
  const [options, planResult] = await Promise.all([
    getPlanBuilderOptions(),
    getPlanById(id),
  ]);

  if (!options.ok) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Editar plan</h1>
        <p className="text-destructive">{options.error}</p>
      </div>
    );
  }

  if (!planResult.ok) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Editar plan</h1>
        <p className="text-destructive">{planResult.error}</p>
      </div>
    );
  }

  const patient =
    options.patients.find((p) => p.id === planResult.plan.patient_id) ?? null;

  return (
    <div className="space-y-10">
      <PlanBuilder
        patients={options.patients}
        exercises={options.exercises}
        initialPlan={planResult.plan}
      />

      <Separator />

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Vista previa / PDF
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Así lo verá el paciente. Puedes exportar el mismo formato a PDF.
            </p>
          </div>
          <Link
            href="/dashboard/plans"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full sm:w-auto"
            )}
          >
            Volver al listado
          </Link>
        </div>

        <PlanDocument
          plan={planResult.plan}
          patientName={patient?.full_name}
          showExport
        />
      </section>
    </div>
  );
}
