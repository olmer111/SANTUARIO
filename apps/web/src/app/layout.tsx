import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SANTUARIO",
  description:
    "Estudio multi-agente que produce videos completos con IA: guion, tomas consistentes, voz y subtítulos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
