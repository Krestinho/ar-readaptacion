"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, Pencil } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DateInputES } from "@/components/ui/date-input-es";
import { EmptyPanel } from "@/components/ui/empty-panel";
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

function statusLabel(plan: ExpiringPlanRow) {
  if (plan.status === "expired") {
    return `Caducado (${Math.abs(plan.daysOffset)} d)`;
  }
  if (plan.daysOffset === 0) return "Caduca hoy";
  return `Caduca en ${plan.daysOffset} d`;
}

function ExpiringPlanActions({
  plan,
  draftDate,
  isPending,
  pendingId,
  onDateChange,
  onExtend,
}: {
  plan: ExpiringPlanRow;
  draftDate: string;
  isPending: boolean;
  pendingId: string | null;
  onDateChange: (iso: string) => void;
  onExtend: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`end-${plan.id}`}>Nueva fecha fin</Label>
        <DateInputES
          id={`end-${plan.id}`}
          valueISO={draftDate}
          onChangeISO={onDateChange}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="flex-1 sm:flex-none"
          disabled={isPending && pendingId === plan.id}
          onClick={onExtend}
        >
          Extender
        </Button>
        <Link
          href={`/dashboard/plans/${plan.id}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "flex-1 gap-1.5 sm:flex-none"
          )}
        >
          <Pencil className="size-3.5" />
          Editar plan
        </Link>
      </div>
    </div>
  );
}

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
      <PageHeader
        title="Caducidad de planes"
        description={`Planes caducados o que caducan en 3 días o menos (pacientes activos). Hoy: ${formatDateES(todayISO())}.`}
      />

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

      <div className="space-y-3 md:hidden">
        {plans.length === 0 ? (
          <EmptyPanel>No hay planes caducados ni próximos a caducar.</EmptyPanel>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="space-y-3">
                <div>
                  <p className="font-medium break-words">{plan.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground break-words">
                    {plan.patient_name || "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      variant={
                        plan.status === "expired" ? "destructive" : "secondary"
                      }
                    >
                      {statusLabel(plan)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Fin: {formatDateES(plan.end_date)}
                    </span>
                  </div>
                </div>
                <ExpiringPlanActions
                  plan={plan}
                  draftDate={draftDates[plan.id] ?? plan.end_date}
                  isPending={isPending}
                  pendingId={pendingId}
                  onDateChange={(iso) =>
                    setDraftDates((prev) => ({ ...prev, [plan.id]: iso }))
                  }
                  onExtend={() => handleExtend(plan.id)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
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
                  <TableCell className="max-w-xs font-medium whitespace-normal break-words">
                    {plan.title}
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal break-words">
                    {plan.patient_name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        plan.status === "expired" ? "destructive" : "secondary"
                      }
                    >
                      {statusLabel(plan)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateES(plan.end_date)}</TableCell>
                  <TableCell className="min-w-[160px]">
                    <Label className="sr-only" htmlFor={`end-desktop-${plan.id}`}>
                      Nueva fecha fin
                    </Label>
                    <DateInputES
                      id={`end-desktop-${plan.id}`}
                      valueISO={draftDates[plan.id] ?? plan.end_date}
                      onChangeISO={(iso) =>
                        setDraftDates((prev) => ({ ...prev, [plan.id]: iso }))
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1">
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
