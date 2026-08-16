import { ExercisesManager } from "@/components/exercises/exercises-manager";
import { createClient } from "@/lib/supabase/server";

export default async function ExercisesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Ejercicios</h1>
        <p className="text-destructive">
          No se pudieron cargar los ejercicios: {error.message}
        </p>
        <p className="text-sm text-muted-foreground">
          Si falta la columna <code>code</code>, ejecuta en Supabase la
          migración <code>003_exercises_code.sql</code>.
        </p>
      </div>
    );
  }

  return <ExercisesManager exercises={data ?? []} />;
}
