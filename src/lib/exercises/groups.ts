/** Grupos principales del documento PDF. */
export const TOP_EXERCISE_GROUPS = ["NEURODINÁMIA", "ANALÍTICOS"] as const;

/** Subgrupos bajo ANALÍTICOS (técnica, región corporal, etc.). */
export const EXERCISE_SUB_GROUPS = [
  "Estructura",
  "Foam",
  "Movilizar",
  "Estiramiento estático activo",
  "Estiramiento dinámico",
  'AIS "Active isolated stretching"',
  "PNF",
  "PNF/CrAc (distracción)",
  "Estabilidad (bajo carga)> fuerza analítica",
  "Tobillo",
  "Rodilla",
  "Cadera",
  "Hombro",
  "Columna",
  "Cervical",
  "Lumbar",
  "Muñeca",
  "Codo",
  "Mano",
  "Pie",
  "Core",
] as const;

const TOP_GROUP_LOOKUP = new Map(
  TOP_EXERCISE_GROUPS.map((g) => [normalizeGroupKey(g), g])
);

const SUB_GROUP_LOOKUP = new Map(
  EXERCISE_SUB_GROUPS.map((g) => [normalizeGroupKey(g), g])
);

/** Líneas de contexto del PDF que no son grupos. */
const GROUP_CONTEXT_SKIP = new Set(
  ["1er meta", "plano", "planos"].map(normalizeGroupKey)
);

export function normalizeGroupKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchTopGroup(line: string): string | null {
  const key = normalizeGroupKey(line);
  return TOP_GROUP_LOOKUP.get(key) ?? null;
}

export function matchSubGroup(line: string): string | null {
  const key = normalizeGroupKey(line);
  if (GROUP_CONTEXT_SKIP.has(key)) return null;
  return SUB_GROUP_LOOKUP.get(key) ?? null;
}

export function formatExerciseGroupName(
  topGroup: string | null,
  subGroup: string | null
): string | null {
  if (subGroup && topGroup) return `${topGroup} · ${subGroup}`;
  if (topGroup) return topGroup;
  if (subGroup) return subGroup;
  return null;
}

/** Opciones para selectores: grupos conocidos + los ya presentes en BD. */
export function buildGroupSelectOptions(existing: Iterable<string | null | undefined>) {
  const values = new Set<string>(TOP_EXERCISE_GROUPS);
  for (const raw of existing) {
    const v = raw?.trim();
    if (v) values.add(v);
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, "es"));
}
