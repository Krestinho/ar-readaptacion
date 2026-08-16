"use client";

import { useMemo, useState, useTransition } from "react";
import { FileUp, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { ExerciseFormDialog } from "@/components/exercises/exercise-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type ExercisesManagerProps = {
  exercises: Exercise[];
};

export function ExercisesManager({ exercises }: ExercisesManagerProps) {
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [importing, startImport] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((exercise) => {
      return (
        exercise.title.toLowerCase().includes(q) ||
        (exercise.code?.toLowerCase().includes(q) ?? false) ||
        exercise.id.toLowerCase().includes(q) ||
        (exercise.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [exercises, query]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ejercicios</h1>
          <p className="text-muted-foreground">
            Biblioteca base para componer planes de rehabilitación.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleImportSeed}
            disabled={importing}
            className="gap-1.5"
          >
            <FileUp className="size-4" />
            {importing ? "Importando…" : "Cargar PDF inicial"}
          </Button>
          <Button type="button" onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" />
            Nuevo ejercicio
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por identificador, título o descripción…"
          className="pl-8"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Identificador</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Descripción</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {exercises.length === 0
                    ? "Todavía no hay ejercicios. Usa “Cargar PDF inicial” o crea uno."
                    : "Ningún ejercicio coincide con la búsqueda."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((exercise) => (
                <TableRow key={exercise.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {exercise.code || "—"}
                  </TableCell>
                  <TableCell className="max-w-[220px] font-medium">
                    <div className="truncate">{exercise.title}</div>
                  </TableCell>
                  <TableCell className="hidden max-w-md md:table-cell">
                    <p className="line-clamp-2 text-muted-foreground">
                      {exercise.description || "—"}
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
      />
    </div>
  );
}
