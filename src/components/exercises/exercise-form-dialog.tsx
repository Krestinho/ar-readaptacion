"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

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
};

export function ExerciseFormDialog({
  open,
  onOpenChange,
  exercise = null,
}: ExerciseFormDialogProps) {
  const isEdit = Boolean(exercise);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData(event.currentTarget);
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
      <DialogContent className="sm:max-w-lg" key={exercise?.id ?? "new"}>
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

          <DialogFooter>
            <DialogClose
              disabled={pending}
              nativeButton
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
