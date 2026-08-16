import { ExpiringPlansManager } from "@/components/plans/expiring-plans-manager";
import { listExpiringPlans } from "@/lib/plans/actions";

export default async function ExpiringPlansPage() {
  const result = await listExpiringPlans();

  if (!result.ok) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Caducidad de planes
        </h1>
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  return <ExpiringPlansManager plans={result.plans} />;
}
