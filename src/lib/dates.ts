/** Fechas en formato español dd/mm/yyyy (ISO yyyy-mm-dd en BBDD). */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ES_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

/** Convierte ISO (yyyy-mm-dd) o timestamp a dd/mm/yyyy. */
export function formatDateES(value: string | null | undefined): string {
  if (!value) return "—";

  const isoDay = value.slice(0, 10);
  if (ISO_DATE.test(isoDay)) {
    const [y, m, d] = isoDay.split("-");
    return `${d}/${m}/${y}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const d = String(parsed.getDate()).padStart(2, "0");
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const y = parsed.getFullYear();
  return `${d}/${m}/${y}`;
}

/** dd/mm/yyyy → yyyy-mm-dd (o null si vacío/inválido). */
export function parseDateES(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (ISO_DATE.test(trimmed)) return trimmed;

  const match = trimmed.match(ES_DATE);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Para inputs controlados: ISO → valor visible dd/mm/yyyy. */
export function isoToInputES(iso: string | null | undefined): string {
  if (!iso) return "";
  const formatted = formatDateES(iso);
  return formatted === "—" ? "" : formatted;
}

export function compareISODate(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

const WEEKDAY_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

const WEEKDAY_ES_SHORT = [
  "Dom",
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
] as const;

/** Lunes→Domingo (calendario clínico). */
export const WEEKDAY_HEADERS_ES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export function weekdayNameES(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAY_ES[new Date(y, m - 1, d).getDay()];
}

export function weekdayShortES(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAY_ES_SHORT[new Date(y, m - 1, d).getDay()];
}

/** Todas las fechas ISO inclusive entre start y end. */
export function eachDayISO(startISO: string, endISO: string): string[] {
  if (!ISO_DATE.test(startISO) || !ISO_DATE.test(endISO)) return [];
  if (compareISODate(startISO, endISO) > 0) return [];

  const days: string[] = [];
  let cursor = startISO;
  while (compareISODate(cursor, endISO) <= 0) {
    days.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return days;
}

export type PlanWeek = {
  /** Índice 1-based relativo al rango del plan */
  weekIndex: number;
  label: string;
  /** Lun→Dom; null si ese hueco no está en el rango */
  days: Array<string | null>;
};

/** Agrupa fechas del rango en semanas lunes–domingo. */
export function groupDaysIntoWeeks(startISO: string, endISO: string): PlanWeek[] {
  const allDays = eachDayISO(startISO, endISO);
  if (allDays.length === 0) return [];

  const [y0, m0, d0] = allDays[0].split("-").map(Number);
  const first = new Date(y0, m0 - 1, d0);
  const mondayOffset = (first.getDay() + 6) % 7;
  const weekStart = addDaysISO(allDays[0], -mondayOffset);

  const weeks: PlanWeek[] = [];
  let cursor = weekStart;
  let weekIndex = 1;

  while (compareISODate(cursor, endISO) <= 0) {
    const days: Array<string | null> = [];
    for (let i = 0; i < 7; i++) {
      const day = addDaysISO(cursor, i);
      const inRange =
        compareISODate(day, startISO) >= 0 && compareISODate(day, endISO) <= 0;
      days.push(inRange ? day : null);
    }

    const present = days.filter(Boolean) as string[];
    if (present.length > 0) {
      const from = present[0].slice(8, 10);
      const to = present[present.length - 1].slice(8, 10);
      weeks.push({
        weekIndex,
        label: `Semana ${weekIndex} (${from}-${to})`,
        days,
      });
      weekIndex += 1;
    }

    cursor = addDaysISO(cursor, 7);
  }

  return weeks;
}
