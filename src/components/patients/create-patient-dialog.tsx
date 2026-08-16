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
import { createPatient } from "@/lib/patients/actions";
import { normalizeUsername } from "@/lib/auth/username";

type CreatePatientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreatePatientDialog({
  open,
  onOpenChange,
}: CreatePatientDialogProps) {
  const [pending, setPending] = useState(false);
  const [username, setUsername] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData(event.currentTarget);
    formData.set("username", normalizeUsername(username));
    const result = await createPatient(formData);

    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(
      `Paciente creado. Usuario: ${result.username}. Entrará con la contraseña provisional y deberá cambiarla.`
    );
    setUsername("");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear paciente</DialogTitle>
          <DialogDescription>
            Crea un usuario tipo nombre.apellido con contraseña provisional. En
            el primer acceso deberá cambiarla.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              placeholder="Pepe Pérez"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              name="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="pepe.perez"
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              Solo letras, números y puntos. Ejemplo: pepe.perez
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña provisional</Label>
            <Input
              id="password"
              name="password"
              type="text"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
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
              {pending ? "Creando…" : "Crear paciente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
