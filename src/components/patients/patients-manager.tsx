"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search, UserPlus, Wrench } from "lucide-react";
import { toast } from "sonner";

import { CreatePatientDialog } from "@/components/patients/create-patient-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  migratePatientToUsername,
  setPatientActive,
  type PatientRow,
} from "@/lib/patients/actions";

type PatientsManagerProps = {
  patients: PatientRow[];
};

export function PatientsManager({ patients }: PatientsManagerProps) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((patient) => {
      return (
        (patient.full_name?.toLowerCase().includes(q) ?? false) ||
        (patient.username?.toLowerCase().includes(q) ?? false) ||
        patient.id.toLowerCase().includes(q)
      );
    });
  }, [patients, query]);

  function toggleActive(patient: PatientRow) {
    setPendingId(patient.id);
    startTransition(async () => {
      const result = await setPatientActive(patient.id, !patient.is_active);
      setPendingId(null);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        patient.is_active ? "Paciente deshabilitado" : "Paciente habilitado"
      );
    });
  }

  function assignUsername(patient: PatientRow) {
    const suggested =
      patient.username ||
      (patient.full_name?.includes("@")
        ? patient.full_name.split("@")[0]
        : patient.full_name
            ?.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, ".")
            .replace(/[^a-z0-9.]/g, "") || "pepe.perez");

    const username = window.prompt("Usuario (nombre.apellido):", suggested);
    if (!username) return;

    const fullName = window.prompt(
      "Nombre completo:",
      patient.full_name?.includes("@") ? "Pepe Pérez" : patient.full_name || ""
    );
    if (fullName === null) return;

    const password = window.prompt(
      "Contraseña provisional (mín. 8 caracteres):",
      "Cambiar123"
    );
    if (!password) return;

    const formData = new FormData();
    formData.set("patient_id", patient.id);
    formData.set("username", username);
    formData.set("full_name", fullName);
    formData.set("password", password);

    startTransition(async () => {
      const result = await migratePatientToUsername(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Listo. Usuario: ${result.username}. Usará la contraseña provisional y deberá cambiarla al entrar.`
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground">
            Alta con usuario (nombre.apellido) y contraseña provisional.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="gap-1.5"
        >
          <UserPlus className="size-4" />
          Crear paciente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o usuario…"
          className="pl-8"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acceso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {patients.length === 0 ? (
                    <span className="inline-flex flex-col items-center gap-2">
                      Todavía no hay pacientes.
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setCreateOpen(true)}
                      >
                        <Plus className="size-3.5" />
                        Crear el primero
                      </Button>
                    </span>
                  ) : (
                    "Ningún paciente coincide con la búsqueda."
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((patient) => {
                const needsMigration =
                  !patient.username ||
                  (patient.full_name?.includes("@") ?? false);

                return (
                  <TableRow
                    key={patient.id}
                    className={!patient.is_active ? "opacity-60" : undefined}
                  >
                    <TableCell className="font-medium">
                      {patient.full_name || "Sin nombre"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {patient.username || "—"}
                      {patient.must_change_password ? (
                        <Badge variant="secondary" className="ml-2">
                          Cambiar pass
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={patient.is_active ? "default" : "secondary"}
                      >
                        {patient.is_active ? "Activo" : "Deshabilitado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={isPending}
                          onClick={() => assignUsername(patient)}
                        >
                          <Wrench className="size-3.5" />
                          {needsMigration ? "Asignar usuario" : "Resetear acceso"}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {patient.is_active ? "On" : "Off"}
                        </span>
                        <Switch
                          checked={patient.is_active}
                          disabled={isPending && pendingId === patient.id}
                          onCheckedChange={() => toggleActive(patient)}
                          aria-label={`Cambiar acceso de ${patient.full_name ?? "paciente"}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreatePatientDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
