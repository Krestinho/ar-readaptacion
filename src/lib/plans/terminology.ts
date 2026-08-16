/** Contenido fijo de terminología de la portada del PDF (referencia clínica). */

export const PLAN_TERMINOLOGY = {
  legend: [
    {
      code: "=",
      text: "Ejercicio a realizar en calentamiento de entrenamiento en pista",
    },
    { code: "DB", text: "Dumbbell (Mancuerna)" },
    { code: "KB", text: "Kettlebell" },
    { code: "BB", text: "Barbell (Barra)" },
    { code: "LMN", text: "Landmine" },
    { code: "RDL", text: "Romanian deadlift (Peso rumano)" },
    {
      code: "A-core",
      text: "Asegurarse de activar significativamente el core",
    },
    {
      code: "A+M",
      text: "Activación y movilidad — aquí evitar cargas altas",
    },
  ],
  dose: [
    "Ejemplo → 4x8(18)/1´ — 4 series × 8 repeticiones (18 = estimación del máximo con ese peso) / 1´ descanso hasta el siguiente ejercicio",
    "Ejemplo → 3x(3x10”/5”) — 10” duración de la repetición / 5” descanso entre repeticiones",
    "Ejemplo → 2:1:X — 2 s fase excéntrica (ECC), 1 s isométrica (ISO), X máxima velocidad concéntrica (CON)",
    "Ejemplo → 70% — en isométricos, % de esfuerzo intencional durante el ejercicio",
  ],
  order:
    "Se realiza por bloques. Si un bloque está compuesto, por ejemplo, por A1 y A2 con 3 series de cada ejercicio, el orden sería: A1, A2, A1, A2, A1, A2.",
} as const;

/** Texto visible cuando aún no hay URL de vídeo. */
export const VIDEO_LINK_PLACEHOLDER = "Link";
