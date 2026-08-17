"use client";

import { useMemo, useState, useTransition } from "react";
import { FileUp, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { ExerciseFormDialog } from "@/components/exercises/exercise-form-dialog";
import { PageHeader } from "@/components/layout/page-header";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/plans/searchable-select";
import { Button } from "@/components/ui/button";
import { EmptyPanel } from "@/components/ui/empty-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importSeedExercises } from "@/lib/exercises/actions";
import type { Exercise } from "@/types/database";
import { Badge } from "@/components/ui/badge";

type ExercisesManagerProps = {
  exercises: Exercise[];
  groupOptions: string[];
};

function ExerciseCard({
  exercise,
  onEdit,
}: {
  exercise: Exercise;
  onEdit: (exercise: Exercise) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-medium text-muted-foreground">
            {exercise.code || "—"}
          </p>
          <p className="mt-1 font-medium break-words">{exercise.title}</p>
          {exercise.group_name ? (
            <div className="mt-2">
              <Badge variant="secondary">{exercise.group_name}</Badge>
            </div>
          ) : null}

          {exercise.description ? (
            <p className="mt-2 text-sm break-words whitespace-pre-wrap text-muted-foreground">
              {exercise.description}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => onEdit(exercise)}
        >
          <Pencil className="size-3.5" />
          Editar
        </Button>
      </div>
    </div>
  );
}

export function ExercisesManager({
  exercises,
  groupOptions,
}: ExercisesManagerProps) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [importing, startImport] = useTransition();

  const groupFilterOptions: SearchableOption[] = useMemo(
    () =>
      groupOptions.map((group) => ({
        value: group,
        label: group,
      })),
    [groupOptions]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (groupFilter && exercise.group_name !== groupFilter) return false;
      if (!q) return true;
      return (
        exercise.title.toLowerCase().includes(q) ||
        (exercise.code?.toLowerCase().includes(q) ?? false) ||
        exercise.id.toLowerCase().includes(q) ||
        (exercise.description?.toLowerCase().includes(q) ?? false) ||
        (exercise.group_name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [exercises, query, groupFilter]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(exercise: Exercise) {
    setEditing(exercise);
    setDialogOpen(true);
  }

  function handleImportSeed() {
    startImport(async () => {
      const result = await importSeedExercises();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (!result.count) {
        toast.message("No había ejercicios nuevos que importar.");
        return;
      }
      toast.success(`Se importaron ${result.count} ejercicios.`);
    });
  }

  const emptyMessage =
    exercises.length === 0
      ? "Todavía no hay ejercicios. Usa “Cargar PDF inicial” o crea uno."
      : "Ningún ejercicio coincide con la búsqueda.";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ejercicios"
        description="Biblioteca base para componer planes de rehabilitación."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleImportSeed}
              disabled={importing}
              className="w-full gap-1.5 sm:w-auto"
            >
              <FileUp className="size-4" />
              {importing ? "Importando…" : "Cargar PDF inicial"}
            </Button>
            <Button
              type="button"
              onClick={openCreate}
              className="w-full gap-1.5 sm:w-auto"
            >
              <Plus className="size-4" />
              Nuevo ejercicio
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por identificador, título o descripción…"
            className="pl-8"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="exercises-group-filter">Grupo</Label>
          <SearchableSelect
            id="exercises-group-filter"
            options={groupFilterOptions}
            value={groupFilter}
            onChange={setGroupFilter}
            placeholder="Todos los grupos"
            searchPlaceholder="Filtrar grupo…"
            emptyMessage="Ningún grupo coincide."
          />
        </div>
      </div>

      {groupFilter ? (
        <p className="text-xs text-muted-foreground">
          Filtrando por grupo{" "}
          <span className="font-medium">{groupFilter}</span>
          {" · "}
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => setGroupFilter(null)}
          >
            Quitar filtro
          </button>
        </p>
      ) : null}

      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <EmptyPanel>{emptyMessage}</EmptyPanel>
        ) : (
          filtered.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onEdit={openEdit}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Identificador</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="hidden lg:table-cell">Descripción</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((exercise) => (
                <TableRow key={exercise.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {exercise.code || "—"}
                  </TableCell>
                  <TableCell className="max-w-[180px] whitespace-normal break-words">
                    {exercise.group_name ? (
                      <Badge variant="secondary">{exercise.group_name}</Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-md font-medium whitespace-normal break-words">
                    {exercise.title}
                  </TableCell>
                  <TableCell className="hidden max-w-md lg:table-cell whitespace-normal break-words">
                    <p className="line-clamp-2 text-muted-foreground">
                      {exercise.description || ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(exercise)}
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ExerciseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        exercise={editing}
        groupOptions={groupOptions}
      />
    </div>
  );
}
