"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deletePlan } from "@/lib/plans/actions";
import { formatDateES } from "@/lib/dates";
import { cn } from "@/lib/utils";

type PlanListItem = {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  patient_id: string;
  patient_name: string | null;
};

type PlansListProps = {
  plans: PlanListItem[];
};

export function PlansList({ plans }: PlansListProps) {
  const [pending, startTransition] = useTransition();

  function handleDelete(planId: string, title: string) {
    if (!window.confirm(`¿Eliminar el plan “${title}”?`)) return;

    startTransition(async () => {
      const result = await deletePlan(planId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Plan eliminado");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planes</h1>
          <p className="text-muted-foreground">
            Planes de rehabilitación asignados a pacientes.
          </p>
        </div>
        <Link
          href="/dashboard/plans/new"
          className={cn(buttonVariants(), "gap-1.5")}
        >
          <Plus className="size-4" />
          Crear plan
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead className="hidden md:table-cell">Fechas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  Todavía no hay planes. Crea el primero.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.title}</TableCell>
                  <TableCell>{plan.patient_name || "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDateES(plan.start_date)} →{" "}
                    {formatDateES(plan.end_date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => handleDelete(plan.id, plan.title)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
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
