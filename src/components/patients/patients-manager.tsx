"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search, UserPlus, Wrench } from "lucide-react";
import { toast } from "sonner";

import { CreatePatientDialog } from "@/components/patients/create-patient-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyPanel } from "@/components/ui/empty-panel";
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

function PatientActions({
  patient,
  needsMigration,
  isPending,
  pendingId,
  onAssign,
  onToggle,
}: {
  patient: PatientRow;
  needsMigration: boolean;
  isPending: boolean;
  pendingId: string | null;
  onAssign: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full gap-1.5 sm:w-auto"
        disabled={isPending}
        onClick={onAssign}
      >
        <Wrench className="size-3.5" />
        {needsMigration ? "Asignar usuario" : "Resetear acceso"}
      </Button>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 sm:justify-end sm:border-0 sm:p-0">
        <span className="text-xs text-muted-foreground">
          Acceso {patient.is_active ? "activo" : "inactivo"}
        </span>
        <Switch
          checked={patient.is_active}
          disabled={isPending && pendingId === patient.id}
          onCheckedChange={onToggle}
          aria-label={`Cambiar acceso de ${patient.full_name ?? "paciente"}`}
        />
      </div>
    </div>
  );
}

function PatientCard({
  patient,
  needsMigration,
  isPending,
  pendingId,
  onAssign,
  onToggle,
}: {
  patient: PatientRow;
  needsMigration: boolean;
  isPending: boolean;
  pendingId: string | null;
  onAssign: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 ${
        !patient.is_active ? "opacity-60" : ""
      }`}
    >
      <div className="space-y-3">
        <div>
          <p className="font-medium break-words">
            {patient.full_name || "Sin nombre"}
          </p>
          <p className="mt-1 font-mono text-sm break-all text-muted-foreground">
            {patient.username || "—"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={patient.is_active ? "default" : "secondary"}>
              {patient.is_active ? "Activo" : "Deshabilitado"}
            </Badge>
            {patient.must_change_password ? (
              <Badge variant="secondary">Cambiar pass</Badge>
            ) : null}
          </div>
        </div>
        <PatientActions
          patient={patient}
          needsMigration={needsMigration}
          isPending={isPending}
          pendingId={pendingId}
          onAssign={onAssign}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}

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

  const emptyMessage =
    patients.length === 0 ? (
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
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        description="Alta con usuario (nombre.apellido) y contraseña provisional."
        actions={
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="w-full gap-1.5 sm:w-auto"
          >
            <UserPlus className="size-4" />
            Crear paciente
          </Button>
        }
      />

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o usuario…"
          className="pl-8"
        />
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.length === 0 ? (
          <EmptyPanel>{emptyMessage}</EmptyPanel>
        ) : (
          filtered.map((patient) => {
            const needsMigration =
              !patient.username ||
              (patient.full_name?.includes("@") ?? false);

            return (
              <PatientCard
                key={patient.id}
                patient={patient}
                needsMigration={needsMigration}
                isPending={isPending}
                pendingId={pendingId}
                onAssign={() => assignUsername(patient)}
                onToggle={() => toggleActive(patient)}
              />
            );
          })
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
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
                  {emptyMessage}
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
                    <TableCell className="max-w-xs font-medium whitespace-normal break-words">
                      {patient.full_name || "Sin nombre"}
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-normal break-all font-mono text-sm">
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
                      <PatientActions
                        patient={patient}
                        needsMigration={needsMigration}
                        isPending={isPending}
                        pendingId={pendingId}
                        onAssign={() => assignUsername(patient)}
                        onToggle={() => toggleActive(patient)}
                      />
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
