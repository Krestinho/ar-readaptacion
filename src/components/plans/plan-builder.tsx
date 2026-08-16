"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  FilePlus2,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/plans/searchable-select";
import { Button } from "@/components/ui/button";
import { DateInputES } from "@/components/ui/date-input-es";
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
import { formatDateES, eachDayISO, weekdayShortES } from "@/lib/dates";
import {
  getLatestPlanForPatient,
  savePlan,
  type PlanExerciseOption,
  type PlanPatientOption,
} from "@/lib/plans/actions";
import type { PlanWithExercises } from "@/types/database";

type DraftItem = {
  localId: string;
  exercise_id: string;
  exercise_code: string | null;
  exercise_title: string;
  custom_instructions: string;
  section_name: string;
  block_name: string;
};

type PlanBuilderProps = {
  patients: PlanPatientOption[];
  exercises: PlanExerciseOption[];
  initialPlan?: PlanWithExercises | null;
};

function createLocalId() {
  return crypto.randomUUID();
}

function mapPlanToDraftItems(plan: PlanWithExercises): DraftItem[] {
  return (plan.plan_exercises ?? [])
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((row) => ({
      localId: createLocalId(),
      exercise_id: row.exercise_id,
      exercise_code: row.exercises?.code ?? null,
      exercise_title: row.exercises?.title ?? "Ejercicio",
      custom_instructions: row.custom_instructions ?? "",
      section_name: row.section_name ?? "",
      block_name: row.block_name ?? "",
    }));
}

function SortableExerciseRow({
  item,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  item: DraftItem;
  index: number;
  total: number;
  onChange: (localId: string, patch: Partial<DraftItem>) => void;
  onRemove: (localId: string) => void;
  onMove: (localId: string, direction: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.localId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-border bg-card p-4 ${
        isDragging ? "z-10 shadow-md opacity-95" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Arrastrar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{item.exercise_title}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {item.exercise_code || item.exercise_id.slice(0, 8)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === 0}
                onClick={() => onMove(item.localId, -1)}
                aria-label="Subir"
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={index === total - 1}
                onClick={() => onMove(item.localId, 1)}
                aria-label="Bajar"
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemove(item.localId)}
                aria-label="Eliminar"
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`section-${item.localId}`}>Día / grupo</Label>
              <Input
                id={`section-${item.localId}`}
                value={item.section_name}
                onChange={(e) =>
                  onChange(item.localId, { section_name: e.target.value })
                }
                placeholder="D_1, D_2, AE/ANAE…"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`block-${item.localId}`}>Bloque</Label>
              <Input
                id={`block-${item.localId}`}
                value={item.block_name}
                onChange={(e) =>
                  onChange(item.localId, { block_name: e.target.value })
                }
                placeholder="A+M, PE, A1, B2…"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`instr-${item.localId}`}>Dosis</Label>
              <Textarea
                id={`instr-${item.localId}`}
                rows={2}
                value={item.custom_instructions}
                onChange={(e) =>
                  onChange(item.localId, {
                    custom_instructions: e.target.value,
                  })
                }
                placeholder="Ej. 3x8(12) / 3:2:X"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlanBuilder({
  patients,
  exercises,
  initialPlan = null,
}: PlanBuilderProps) {
  const router = useRouter();
  const isEdit = Boolean(initialPlan);

  const [patientId, setPatientId] = useState<string | null>(
    initialPlan?.patient_id ?? null
  );
  const [title, setTitle] = useState(initialPlan?.title ?? "");
  const [startDate, setStartDate] = useState(initialPlan?.start_date ?? "");
  const [endDate, setEndDate] = useState(initialPlan?.end_date ?? "");
  const [trainingDays, setTrainingDays] = useState<string[]>(
    () => initialPlan?.training_days ?? []
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(
    null
  );
  const [items, setItems] = useState<DraftItem[]>(() =>
    initialPlan ? mapPlanToDraftItems(initialPlan) : []
  );
  const [saving, setSaving] = useState(false);
  const [checkingPatient, setCheckingPatient] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneCandidate, setCloneCandidate] =
    useState<PlanWithExercises | null>(null);

  const patientOptions: SearchableOption[] = useMemo(
    () =>
      patients.map((patient) => ({
        value: patient.id,
        label: patient.full_name || "Sin nombre",
        keywords: patient.email ?? "",
      })),
    [patients]
  );

  const exerciseOptions: SearchableOption[] = useMemo(
    () =>
      exercises.map((exercise) => ({
        value: exercise.id,
        label: exercise.code
          ? `${exercise.code} · ${exercise.title}`
          : exercise.title,
        keywords: `${exercise.code ?? ""} ${exercise.title} ${exercise.id}`,
      })),
    [exercises]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handlePatientChange(nextId: string | null) {
    setPatientId(nextId);

    if (isEdit || !nextId) {
      setCloneCandidate(null);
      setCloneOpen(false);
      return;
    }

    setCheckingPatient(true);
    const result = await getLatestPlanForPatient(nextId);
    setCheckingPatient(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (result.plan) {
      setCloneCandidate(result.plan);
      setCloneOpen(true);
    } else {
      setCloneCandidate(null);
      setCloneOpen(false);
    }
  }

  const rangeDays = useMemo(() => {
    if (!startDate || !endDate) return [];
    return eachDayISO(startDate, endDate);
  }, [startDate, endDate]);

  function setStartDateSafe(next: string) {
    setStartDate(next);
    if (next && endDate) {
      const allowed = new Set(eachDayISO(next, endDate));
      setTrainingDays((prev) => prev.filter((d) => allowed.has(d)));
    } else {
      setTrainingDays([]);
    }
  }

  function setEndDateSafe(next: string) {
    setEndDate(next);
    if (startDate && next) {
      const allowed = new Set(eachDayISO(startDate, next));
      setTrainingDays((prev) => prev.filter((d) => allowed.has(d)));
    } else {
      setTrainingDays([]);
    }
  }

  function toggleTrainingDay(day: string) {
    setTrainingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function applyClone() {
    if (!cloneCandidate) return;
    setTitle(cloneCandidate.title);
    setStartDate(cloneCandidate.start_date ?? "");
    setEndDate(cloneCandidate.end_date ?? "");
    setTrainingDays(cloneCandidate.training_days ?? []);
    setItems(mapPlanToDraftItems(cloneCandidate));
    setCloneOpen(false);
    toast.message("Se ha cargado el plan anterior para modificarlo.");
  }

  function startFromScratch() {
    setItems([]);
    setTitle("");
    setStartDate("");
    setEndDate("");
    setTrainingDays([]);
    setCloneOpen(false);
    toast.message("Empiezas un plan desde cero.");
  }

  function addExercise() {
    if (!selectedExerciseId) {
      toast.error("Selecciona un ejercicio para añadir.");
      return;
    }
    const exercise = exercises.find((e) => e.id === selectedExerciseId);
    if (!exercise) return;

    setItems((prev) => [
      ...prev,
      {
        localId: createLocalId(),
        exercise_id: exercise.id,
        exercise_code: exercise.code,
        exercise_title: exercise.title,
        custom_instructions: "",
        section_name: "",
        block_name: "",
      },
    ]);
    setSelectedExerciseId(null);
  }

  function updateItem(localId: string, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, ...patch } : item))
    );
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((item) => item.localId !== localId));
  }

  function moveItem(localId: string, direction: -1 | 1) {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.localId === localId);
      if (index < 0) return prev;
      const next = index + direction;
      if (next < 0 || next >= prev.length) return prev;
      return arrayMove(prev, index, next);
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.localId === active.id);
      const newIndex = prev.findIndex((item) => item.localId === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function handleSave() {
    setSaving(true);
    const result = await savePlan({
      planId: initialPlan?.id,
      patient_id: patientId ?? "",
      title,
      start_date: startDate || null,
      end_date: endDate || null,
      training_days: trainingDays,
      exercises: items.map((item, index) => ({
        exercise_id: item.exercise_id,
        custom_instructions: item.custom_instructions,
        section_name: item.section_name,
        block_name: item.block_name,
        order_index: index,
      })),
    });
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(isEdit ? "Plan actualizado" : "Plan creado");
    router.push(`/dashboard/plans/${result.planId}`);
    router.refresh();
  }

  const groupedPreview = useMemo(() => {
    const groups: { section: string; count: number }[] = [];
    for (const item of items) {
      const section = item.section_name.trim() || "Sin sección";
      const last = groups[groups.length - 1];
      if (last && last.section === section) last.count += 1;
      else groups.push({ section, count: 1 });
    }
    return groups;
  }, [items]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEdit ? "Editar plan" : "Crear plan"}
          </h1>
          <p className="text-muted-foreground">
            Selecciona paciente, añade ejercicios, organiza por secciones y
            guarda. Puedes editar la fecha de fin para extender el plan.
          </p>
        </div>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Guardar plan"}
        </Button>
      </div>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <Label>Paciente</Label>
          <SearchableSelect
            options={patientOptions}
            value={patientId}
            onChange={handlePatientChange}
            placeholder="Buscar paciente…"
            searchPlaceholder="Nombre del paciente…"
            emptyMessage="No hay pacientes activos."
            disabled={isEdit || checkingPatient}
          />
          {checkingPatient ? (
            <p className="text-xs text-muted-foreground">
              Comprobando si el paciente tiene un plan anterior…
            </p>
          ) : null}
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="plan-title">Título del plan</Label>
          <Input
            id="plan-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Readaptación rodilla — semana 1"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="start-date">Fecha inicio</Label>
          <DateInputES
            id="start-date"
            valueISO={startDate}
            onChangeISO={setStartDateSafe}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end-date">Fecha fin</Label>
          <DateInputES
            id="end-date"
            valueISO={endDate}
            onChangeISO={setEndDateSafe}
          />
        </div>

        {rangeDays.length > 0 ? (
          <div className="grid gap-2 md:col-span-2">
            <Label>Días de entrenamiento</Label>
            <p className="text-xs text-muted-foreground">
              Marca los días del rango que saldrán resaltados en la portada del
              PDF (junto a la terminología).
            </p>
            <div className="flex flex-wrap gap-2">
              {rangeDays.map((day) => {
                const selected = trainingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleTrainingDay(day)}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors ${
                      selected
                        ? "border-[#a67c52] bg-[#a67c52] text-white"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <span className="block text-[11px] opacity-80">
                      {weekdayShortES(day)}
                    </span>
                    <span className="font-medium">{formatDateES(day)}</span>
                  </button>
                );
              })}
            </div>
            {trainingDays.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {trainingDays.length} día
                {trainingDays.length === 1 ? "" : "s"} seleccionado
                {trainingDays.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="font-medium">Añadir ejercicio</h2>
          <p className="text-sm text-muted-foreground">
            Busca por identificador o nombre.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchableSelect
            className="flex-1"
            options={exerciseOptions}
            value={selectedExerciseId}
            onChange={setSelectedExerciseId}
            placeholder="Buscar ejercicio…"
            searchPlaceholder="Código o título…"
            emptyMessage="No se encontraron ejercicios."
          />
          <Button type="button" onClick={addExercise} className="gap-1.5">
            <Plus className="size-4" />
            Añadir
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">
            Ejercicios del plan ({items.length})
          </h2>
          {groupedPreview.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {groupedPreview.map((g) => `${g.section} (${g.count})`).join(" · ")}
            </p>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-muted-foreground">
            Todavía no hay ejercicios en este plan.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.localId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {items.map((item, index) => (
                  <SortableExerciseRow
                    key={item.localId}
                    item={item}
                    index={index}
                    total={items.length}
                    onChange={updateItem}
                    onRemove={removeItem}
                    onMove={moveItem}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plan anterior encontrado</DialogTitle>
            <DialogDescription>
              {cloneCandidate ? (
                <>
                  Este paciente ya tiene el plan{" "}
                  <strong>{cloneCandidate.title}</strong>
                  {cloneCandidate.end_date
                    ? ` (fin: ${formatDateES(cloneCandidate.end_date)})`
                    : ""}
                  . ¿Quieres partir de él o empezar desde cero?
                </>
              ) : (
                "El paciente tiene un plan previo."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:flex-col">
            <Button type="button" className="gap-1.5" onClick={applyClone}>
              <Copy className="size-4" />
              Usar plan anterior y modificarlo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={startFromScratch}
            >
              <FilePlus2 className="size-4" />
              Empezar plan desde cero
            </Button>
            <DialogClose
              nativeButton
              className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
