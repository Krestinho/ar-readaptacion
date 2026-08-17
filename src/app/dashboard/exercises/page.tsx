import { ExercisesManager } from "@/components/exercises/exercises-manager";
import { buildGroupSelectOptions } from "@/lib/exercises/groups";
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
          Si falta la columna <code>group_name</code>, ejecuta en Supabase la
          migración <code>007_exercise_groups.sql</code>.
        </p>
      </div>
    );
  }

  const groupOptions = buildGroupSelectOptions(
    (data ?? []).map((exercise) => exercise.group_name)
  );

  return (
    <ExercisesManager exercises={data ?? []} groupOptions={groupOptions} />
  );
}
