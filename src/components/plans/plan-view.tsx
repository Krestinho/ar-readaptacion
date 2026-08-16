"use client";

import { ExternalLink } from "lucide-react";

import {
  formatDateES,
  groupDaysIntoWeeks,
  WEEKDAY_HEADERS_ES,
} from "@/lib/dates";
import { groupPlanExercisesBySection } from "@/lib/plans/group";
import {
  PLAN_TERMINOLOGY,
  VIDEO_LINK_PLACEHOLDER,
} from "@/lib/plans/terminology";
import type { PlanWithExercises } from "@/types/database";

type PlanViewProps = {
  plan: PlanWithExercises;
  patientName?: string | null;
  className?: string;
};

export function PlanView({ plan, patientName, className }: PlanViewProps) {
  const groups = groupPlanExercisesBySection(plan.plan_exercises ?? []);
  const trainingSet = new Set(plan.training_days ?? []);
  const weeks =
    plan.start_date && plan.end_date
      ? groupDaysIntoWeeks(plan.start_date, plan.end_date)
      : [];

  return (
    <article
      className={className}
      data-plan-view
      style={{ backgroundColor: "#fffcf8", color: "#2a3340" }}
    >
      <header className="border-b border-[#e2d6c8] pb-4">
        <p
          className="text-xs font-medium tracking-[0.16em] uppercase"
          style={{ color: "#a67c52" }}
        >
          Plan de rehabilitación
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {plan.title}
        </h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6b7280]">
          {patientName ? <span>Paciente: {patientName}</span> : null}
          {plan.start_date || plan.end_date ? (
            <span>
              {formatDateES(plan.start_date)} → {formatDateES(plan.end_date)}
            </span>
          ) : null}
        </div>
      </header>

      {/* Portada: calendario de días + terminología */}
      <section className="mt-6 space-y-6 border-b border-[#e2d6c8] pb-6">
        {weeks.length > 0 ? (
          <div className="space-y-4">
            {weeks.map((week) => (
              <div key={week.weekIndex}>
                <h2 className="mb-2 text-base font-semibold">{week.label}</h2>
                <div className="overflow-hidden rounded-lg border border-[#e2d6c8]">
                  <div className="grid grid-cols-7 bg-[#f3ebe2] text-center text-[11px] font-medium sm:text-xs">
                    {WEEKDAY_HEADERS_ES.map((day) => (
                      <div key={day} className="border-r border-[#e2d6c8] px-1 py-1.5 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 text-center text-sm">
                    {week.days.map((day, idx) => {
                      const selected = day ? trainingSet.has(day) : false;
                      return (
                        <div
                          key={`${week.weekIndex}-${idx}`}
                          className="min-h-10 border-t border-r border-[#e2d6c8] px-1 py-2 last:border-r-0"
                          style={
                            selected
                              ? { backgroundColor: "#a67c52", color: "#fff" }
                              : undefined
                          }
                        >
                          {day ? day.slice(8, 10) : ""}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-lg border border-[#e2d6c8] bg-white p-4 text-sm leading-relaxed">
          <ul className="space-y-1.5">
            {PLAN_TERMINOLOGY.legend.map((item) => (
              <li key={item.code}>
                <span className="font-semibold" style={{ color: "#a67c52" }}>
                  {item.code}
                </span>
                {" = "}
                {item.text}
              </li>
            ))}
          </ul>

          <h3 className="mt-4 font-semibold tracking-wide uppercase">Dosis</h3>
          <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-[#4b5563]">
            {PLAN_TERMINOLOGY.dose.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <h3 className="mt-4 font-semibold tracking-wide uppercase">Orden</h3>
          <p className="mt-1.5 text-[#4b5563]">{PLAN_TERMINOLOGY.order}</p>
        </div>
      </section>

      {/* Lista de ejercicios al estilo del documento */}
      <div className="mt-6 space-y-8">
        {groups.length === 0 ? (
          <p className="text-sm text-[#6b7280]">
            Este plan todavía no tiene ejercicios.
          </p>
        ) : (
          groups.map((group, groupIndex) => (
            <section key={`${group.sectionName ?? "none"}-${groupIndex}`}>
              <h2
                className="mb-3 border-b border-[#e2d6c8] pb-2 text-xl font-semibold"
                style={{ color: "#2a3340" }}
              >
                {group.sectionName || "Ejercicios"}
              </h2>

              <div className="overflow-hidden rounded-lg border border-[#e2d6c8]">
                <div
                  className="grid grid-cols-[72px_1fr_110px_64px] gap-0 bg-[#f3ebe2] text-xs font-semibold tracking-wide uppercase sm:grid-cols-[88px_1fr_140px_72px] sm:text-sm"
                  style={{ color: "#2a3340" }}
                >
                  <div className="border-r border-[#e2d6c8] px-2 py-2">Bloque</div>
                  <div className="border-r border-[#e2d6c8] px-2 py-2">Ejercicio</div>
                  <div className="border-r border-[#e2d6c8] px-2 py-2">Dosis</div>
                  <div className="px-2 py-2">Video</div>
                </div>

                {group.items.map((item) => {
                  const videoUrl = item.exercises?.video_url?.trim();
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[72px_1fr_110px_64px] border-t border-[#e2d6c8] bg-white text-sm sm:grid-cols-[88px_1fr_140px_72px]"
                    >
                      <div className="border-r border-[#e2d6c8] px-2 py-3 font-medium">
                        {item.block_name || "—"}
                      </div>
                      <div className="border-r border-[#e2d6c8] px-2 py-3">
                        <p className="font-medium leading-snug">
                          {item.exercises?.title ?? "Ejercicio"}
                        </p>
                        {item.exercises?.description ? (
                          <p className="mt-1 text-xs whitespace-pre-wrap text-[#6b7280]">
                            {item.exercises.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="border-r border-[#e2d6c8] px-2 py-3 whitespace-pre-wrap">
                        {item.custom_instructions || "—"}
                      </div>
                      <div className="px-2 py-3">
                        {videoUrl ? (
                          <a
                            href={videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium"
                            style={{ color: "#a67c52" }}
                          >
                            {VIDEO_LINK_PLACEHOLDER}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-[#9ca3af]">
                            {VIDEO_LINK_PLACEHOLDER}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </article>
  );
}
