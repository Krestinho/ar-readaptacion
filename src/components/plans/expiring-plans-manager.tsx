"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DateInputES } from "@/components/ui/date-input-es";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateES, todayISO } from "@/lib/dates";
import {
  updatePlanEndDate,
  type ExpiringPlanRow,
} from "@/lib/plans/actions";
import { cn } from "@/lib/utils";

type ExpiringPlansManagerProps = {
  plans: ExpiringPlanRow[];
};

export function ExpiringPlansManager({ plans }: ExpiringPlansManagerProps) {
  const [draftDates, setDraftDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(plans.map((plan) => [plan.id, plan.end_date]))
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const expiredCount = useMemo(
    () => plans.filter((p) => p.status === "expired").length,
    [plans]
  );
  const soonCount = plans.length - expiredCount;

  function handleExtend(planId: string) {
    const endDate = draftDates[planId];
    if (!endDate) {
      toast.error("Indica una fecha de fin válida.");
      return;
    }

    setPendingId(planId);
    startTransition(async () => {
      const result = await updatePlanEndDate(planId, endDate);
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Fecha de fin actualizada");
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Caducidad de planes
        </h1>
        <p className="text-muted-foreground">
          Planes caducados o que caducan en 3 días o menos, solo de pacientes
          activos. Hoy: {formatDateES(todayISO())}.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5">
          <AlertTriangle className="size-3.5 text-destructive" />
          Caducados: {expiredCount}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5">
          <Clock3 className="size-3.5 text-[#a67c52]" />
          Por caducar: {soonCount}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fin actual</TableHead>
              <TableHead>Nueva fecha fin</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No hay planes caducados ni próximos a caducar.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.title}</TableCell>
                  <TableCell>{plan.patient_name || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        plan.status === "expired" ? "destructive" : "secondary"
                      }
                    >
                      {plan.status === "expired"
                        ? `Caducado (${Math.abs(plan.daysOffset)} d)`
                        : plan.daysOffset === 0
                          ? "Caduca hoy"
                          : `Caduca en ${plan.daysOffset} d`}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateES(plan.end_date)}</TableCell>
                  <TableCell className="min-w-[140px]">
                    <Label className="sr-only" htmlFor={`end-${plan.id}`}>
                      Nueva fecha fin
                    </Label>
                    <DateInputES
                      id={`end-${plan.id}`}
                      valueISO={draftDates[plan.id] ?? plan.end_date}
                      onChangeISO={(iso) =>
                        setDraftDates((prev) => ({ ...prev, [plan.id]: iso }))
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isPending && pendingId === plan.id}
                        onClick={() => handleExtend(plan.id)}
                      >
                        Extender
                      </Button>
                      <Link
                        href={`/dashboard/plans/${plan.id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          "gap-1.5"
                        )}
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
