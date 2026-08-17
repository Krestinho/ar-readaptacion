"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/plans/searchable-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createExercise,
  updateExercise,
} from "@/lib/exercises/actions";
import type { Exercise } from "@/types/database";

type ExerciseFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise?: Exercise | null;
  groupOptions: string[];
};

export function ExerciseFormDialog({
  open,
  onOpenChange,
  exercise = null,
  groupOptions,
}: ExerciseFormDialogProps) {
  const isEdit = Boolean(exercise);
  const [pending, setPending] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(
    exercise?.group_name ?? null
  );

  useEffect(() => {
    if (open) {
      setSelectedGroup(exercise?.group_name ?? null);
    }
  }, [open, exercise?.group_name]);

  const groupSelectOptions: SearchableOption[] = useMemo(
    () =>
      groupOptions.map((group) => ({
        value: group,
        label: group,
      })),
    [groupOptions]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData(event.currentTarget);
    if (selectedGroup) {
      formData.set("group_name", selectedGroup);
    } else {
      formData.delete("group_name");
    }

    const result = isEdit
      ? await updateExercise(exercise!.id, formData)
      : await createExercise(formData);

    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Ejercicio actualizado" : "Ejercicio creado");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-lg sm:max-w-lg"
        key={exercise?.id ?? "new"}
      >
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar ejercicio" : "Nuevo ejercicio"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos del ejercicio de la biblioteca."
              : "Añade un ejercicio a la biblioteca clínica."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="group_name">Grupo</Label>
            <SearchableSelect
              id="group_name"
              options={groupSelectOptions}
              value={selectedGroup}
              onChange={setSelectedGroup}
              placeholder="Ej. NEURODINÁMIA, ANALÍTICOS · Tobillo…"
              searchPlaceholder="Buscar grupo…"
              emptyMessage="Ningún grupo coincide."
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              Grupo clínico del documento (NEURODINÁMIA, ANALÍTICOS · Tobillo…).
              No confundir con el bloque del plan (A+M, PE…).
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="code">Identificador</Label>
            <Input
              id="code"
              name="code"
              defaultValue={exercise?.code ?? ""}
              placeholder="Ej. CERV-001"
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              Código propio para buscar y para el import CSV. Debe ser único.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={exercise?.title ?? ""}
              placeholder="Ej. Movilidad cervical en sedestación"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={exercise?.description ?? ""}
              placeholder="Indicaciones generales del ejercicio base…"
              disabled={pending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="video_url">URL del vídeo</Label>
            <Input
              id="video_url"
              name="video_url"
              type="url"
              defaultValue={exercise?.video_url ?? ""}
              placeholder="https://…"
              disabled={pending}
            />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <DialogClose
              disabled={pending}
              nativeButton
              className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
            >
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
