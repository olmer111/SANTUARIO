import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "SANTUARIO",
  description:
    "Estudio multi-agente que produce videos completos con IA: guion, tomas consistentes, voz y subtítulos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#contenido"
          className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-3 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-tungsteno focus-visible:px-3 focus-visible:py-2 focus-visible:text-tungsteno-ink"
        >
          Saltar al contenido
        </a>
        <div className="flex min-h-dvh flex-col md:flex-row">
          <Nav />
          <main id="contenido" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
