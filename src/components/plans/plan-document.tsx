"use client";

import { useRef, useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

import { PlanView } from "@/components/plans/plan-view";
import { Button } from "@/components/ui/button";
import type { PlanWithExercises } from "@/types/database";

type PlanDocumentProps = {
  plan: PlanWithExercises;
  patientName?: string | null;
  showExport?: boolean;
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function PlanDocument({
  plan,
  patientName,
  showExport = true,
}: PlanDocumentProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExportPdf() {
    if (!printRef.current) return;
    setExporting(true);

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fffcf8",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const usableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(`plan-${slugify(plan.title) || "rehabilitacion"}.pdf`);
      toast.success("PDF generado");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo generar el PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {showExport ? (
        <div className="flex justify-stretch sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-1.5 sm:w-auto"
            onClick={handleExportPdf}
            disabled={exporting}
          >
            <FileDown className="size-4" />
            {exporting ? "Generando PDF…" : "Exportar PDF"}
          </Button>
        </div>
      ) : null}

      <div
        ref={printRef}
        className="overflow-hidden rounded-xl border border-border p-3 sm:p-6"
      >
        <PlanView plan={plan} patientName={patientName} />
      </div>
    </div>
  );
}
