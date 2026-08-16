import { PlansList } from "@/components/plans/plans-list";
import { listPlans } from "@/lib/plans/actions";

export default async function PlansPage() {
  const result = await listPlans();

  if (!result.ok) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Planes</h1>
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  return <PlansList plans={result.plans} />;
}
