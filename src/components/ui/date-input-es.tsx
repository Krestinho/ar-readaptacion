"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateES, todayISO, WEEKDAY_HEADERS_ES } from "@/lib/dates";
import { cn } from "@/lib/utils";

type DateInputESProps = {
  id?: string;
  valueISO: string;
  onChangeISO: (iso: string) => void;
  disabled?: boolean;
  className?: string;
  required?: boolean;
};

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

function parseISOParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

/** Celdas del mes (Lun→Dom). */
function monthGrid(y: number, m: number) {
  const firstISO = toISO(y, m, 1);
  const { y: yy, m: mm, d } = parseISOParts(firstISO);
  const jsDay = new Date(yy, mm - 1, d).getDay();
  const mondayIndex = (jsDay + 6) % 7;
  const total = daysInMonth(y, m);
  const cells: Array<string | null> = [];

  for (let i = 0; i < mondayIndex; i++) cells.push(null);
  for (let day = 1; day <= total; day++) cells.push(toISO(y, m, day));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

/**
 * Selector de fecha con calendario.
 * Internamente trabaja con ISO (yyyy-mm-dd) para la BBDD.
 */
export function DateInputES({
  id,
  valueISO,
  onChangeISO,
  disabled,
  className,
  required,
}: DateInputESProps) {
  const [open, setOpen] = useState(false);

  const initial = valueISO || todayISO();
  const initParts = parseISOParts(initial);
  const [viewYear, setViewYear] = useState(initParts.y);
  const [viewMonth, setViewMonth] = useState(initParts.m);

  const cells = useMemo(
    () => monthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const today = todayISO();
  const label = valueISO ? formatDateES(valueISO) : "Seleccionar fecha";

  function openCalendar(next: boolean) {
    if (next) {
      const base = valueISO || todayISO();
      const parts = parseISOParts(base);
      setViewYear(parts.y);
      setViewMonth(parts.m);
    }
    setOpen(next);
  }

  function shiftMonth(delta: number) {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  }

  function selectDay(iso: string) {
    onChangeISO(iso);
    setOpen(false);
  }

  function clearDate() {
    onChangeISO("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={openCalendar}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-required={required || undefined}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-full justify-start gap-2 px-2.5 font-normal",
          !valueISO && "text-muted-foreground",
          className
        )}
      >
        <CalendarDays className="size-4 shrink-0 opacity-70" />
        <span className="truncate">{label}</span>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[288px] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => shiftMonth(-1)}
            aria-label="Mes anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="text-sm font-medium">
            {MONTHS_ES[viewMonth - 1]} {viewYear}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => shiftMonth(1)}
            aria-label="Mes siguiente"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-muted-foreground">
          {WEEKDAY_HEADERS_ES.map((day) => (
            <div key={day} className="py-1">
              {day.slice(0, 2)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="size-9" />;
            }

            const selected = day === valueISO;
            const isToday = day === today;

            return (
              <button
                key={day}
                type="button"
                onClick={() => selectDay(day)}
                className={cn(
                  "size-9 rounded-lg text-sm transition-colors hover:bg-muted",
                  selected &&
                    "bg-[#a67c52] text-white hover:bg-[#a67c52]/90",
                  !selected && isToday && "ring-1 ring-[#a67c52]/50"
                )}
              >
                {Number(day.slice(8, 10))}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => selectDay(today)}
          >
            Hoy
          </Button>
          <div className="flex gap-1">
            {valueISO ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearDate}
              >
                Borrar
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
