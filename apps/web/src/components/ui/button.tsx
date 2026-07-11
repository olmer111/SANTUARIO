import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type Variante = "primaria" | "secundaria" | "fantasma" | "peligro";

const VARIANTES: Record<Variante, string> = {
  primaria:
    "bg-tungsteno text-tungsteno-ink hover:brightness-110 disabled:hover:brightness-100",
  secundaria:
    "border border-line bg-transparent text-ink hover:bg-canvas-overlay",
  fantasma: "bg-transparent text-ink-muted hover:text-ink hover:bg-canvas-overlay",
  peligro: "border border-error/40 text-error hover:bg-error/10",
};

interface BotonProps extends ComponentProps<"button"> {
  variante?: Variante;
}

export function Boton({ className, variante = "primaria", ...props }: BotonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
        "transition-[filter,background-color,color] duration-150",
        "disabled:cursor-not-allowed disabled:opacity-40",
        VARIANTES[variante],
        className
      )}
      {...props}
    />
  );
}
