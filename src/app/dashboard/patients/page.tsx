import { PatientsManager } from "@/components/patients/patients-manager";
import { listPatients } from "@/lib/patients/actions";

export default async function PatientsPage() {
  const result = await listPatients();

  if (!result.ok) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  return <PatientsManager patients={result.patients} />;
}
