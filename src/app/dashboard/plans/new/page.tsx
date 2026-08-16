import { PlanBuilder } from "@/components/plans/plan-builder";
import { getPlanBuilderOptions } from "@/lib/plans/actions";

export default async function CreatePlanPage() {
  const result = await getPlanBuilderOptions();

  if (!result.ok) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Crear plan</h1>
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  return (
    <PlanBuilder patients={result.patients} exercises={result.exercises} />
  );
}
