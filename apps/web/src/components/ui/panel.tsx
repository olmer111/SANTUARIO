import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Panel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-canvas-raised p-5",
        className
      )}
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)} {...props} />
  );
}

export function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint",
        className
      )}
      {...props}
    />
  );
}
