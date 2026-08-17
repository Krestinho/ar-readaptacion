"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyPanel } from "@/components/ui/empty-panel";
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

function PlanActions({
  planId,
  title,
  pending,
  onDelete,
  className,
}: {
  planId: string;
  title: string;
  pending: boolean;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Link
        href={`/dashboard/plans/${planId}`}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "flex-1 gap-1.5 sm:flex-none"
        )}
      >
        <Pencil className="size-3.5" />
        Editar
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="flex-1 sm:flex-none"
        disabled={pending}
        onClick={onDelete}
      >
        <Trash2 className="size-3.5 text-destructive" />
        Eliminar
      </Button>
    </div>
  );
}

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
      <PageHeader
        title="Planes"
        description="Planes de rehabilitación asignados a pacientes."
        actions={
          <Link
            href="/dashboard/plans/new"
            className={cn(buttonVariants(), "w-full gap-1.5 sm:w-auto")}
          >
            <Plus className="size-4" />
            Crear plan
          </Link>
        }
      />

      <div className="space-y-3 md:hidden">
        {plans.length === 0 ? (
          <EmptyPanel>Todavía no hay planes. Crea el primero.</EmptyPanel>
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
                    {plan.patient_name || "Sin paciente"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatDateES(plan.start_date)} →{" "}
                    {formatDateES(plan.end_date)}
                  </p>
                </div>
                <PlanActions
                  planId={plan.id}
                  title={plan.title}
                  pending={pending}
                  onDelete={() => handleDelete(plan.id, plan.title)}
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
              <TableHead>Título</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Fechas</TableHead>
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
                  <TableCell className="max-w-xs font-medium whitespace-normal break-words">
                    {plan.title}
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal break-words">
                    {plan.patient_name || "—"}
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {formatDateES(plan.start_date)} →{" "}
                    {formatDateES(plan.end_date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <PlanActions
                      planId={plan.id}
                      title={plan.title}
                      pending={pending}
                      onDelete={() => handleDelete(plan.id, plan.title)}
                      className="justify-end"
                    />
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
