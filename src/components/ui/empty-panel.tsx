import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyPanelProps = {
  children: ReactNode;
  className?: string;
};

export function EmptyPanel({ children, className }: EmptyPanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  );
}
