/** Une los encabezados Word (niveles 1–5) en el `group_name` del ejercicio. */
export const GROUP_NAME_SEPARATOR = " · ";

export function formatExerciseGroupName(
  headings: Array<string | null | undefined>
): string | null {
  const parts = headings
    .map((heading) => heading?.replace(/\s+/g, " ").trim())
    .filter((heading): heading is string => Boolean(heading));
  return parts.length > 0 ? parts.join(GROUP_NAME_SEPARATOR) : null;
}

/** Opciones para selectores: grupos ya presentes en BD o en el seed. */
export function buildGroupSelectOptions(
  existing: Iterable<string | null | undefined>
) {
  const values = new Set<string>();
  for (const raw of existing) {
    const value = raw?.trim();
    if (value) values.add(value);
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
}
