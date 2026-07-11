import { cn } from "@/lib/utils";

type Estado = "cola" | "procesando" | "listo" | "error" | "qa_fallo" | "pendiente";

const CONFIG: Record<Estado, { color: string; label: string; activo: boolean }> = {
  pendiente: { color: "bg-ink-faint", label: "Pendiente", activo: false },
  cola: { color: "bg-scope", label: "En cola", activo: true },
  procesando: { color: "bg-tungsteno", label: "Generando", activo: true },
  listo: { color: "bg-scope", label: "Listo", activo: false },
  qa_fallo: { color: "bg-error", label: "QA rechazó", activo: false },
  error: { color: "bg-error", label: "Error", activo: false },
};

export function StatusDot({ estado, className }: { estado: string; className?: string }) {
  const cfg = CONFIG[estado as Estado] ?? { color: "bg-ink-faint", label: estado, activo: false };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          cfg.color,
          cfg.activo && "animate-rec"
        )}
        aria-hidden="true"
      />
      <span className="text-ink-muted">{cfg.label}</span>
    </span>
  );
}
