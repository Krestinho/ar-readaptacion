import type { PlanExerciseWithExercise } from "@/types/database";

export type PlanSectionGroup = {
  sectionName: string | null;
  items: PlanExerciseWithExercise[];
};

/** Agrupa en orden, abriendo sección nueva cuando cambia section_name. */
export function groupPlanExercisesBySection(
  exercises: PlanExerciseWithExercise[]
): PlanSectionGroup[] {
  const sorted = [...exercises].sort((a, b) => a.order_index - b.order_index);
  const groups: PlanSectionGroup[] = [];

  for (const item of sorted) {
    const sectionName = item.section_name?.trim() || null;
    const last = groups[groups.length - 1];
    if (last && last.sectionName === sectionName) {
      last.items.push(item);
    } else {
      groups.push({ sectionName, items: [item] });
    }
  }

  return groups;
}
