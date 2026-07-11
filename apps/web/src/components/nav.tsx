"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Proyectos" },
  { href: "/estudio", label: "Estudio" },
  { href: "/adn", label: "ADN de Estilo" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="flex shrink-0 flex-col gap-1 border-r border-line bg-canvas px-3 py-6 md:w-56"
    >
      <Link
        href="/"
        className="mb-6 px-3 font-display text-lg font-semibold tracking-tight text-ink"
      >
        SANTUARIO
      </Link>
      {ITEMS.map((item) => {
        const activo =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-2 text-sm transition-colors duration-150",
              activo
                ? "bg-canvas-overlay text-ink"
                : "text-ink-muted hover:bg-canvas-overlay/60 hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
