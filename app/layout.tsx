import type { Metadata } from "next";
import { Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";

// Condensada de rótulo, como la rotulación de paneles y parches de misión. Solo para nombres.
const rotulo = Barlow_Semi_Condensed({ subsets: ["latin"], weight: ["500", "600"], variable: "--fuente-rotulo" });

export const metadata: Metadata = {
  title: "Órbita Vital | Salud de la tripulación",
  description: "Monitoreo en tiempo real de la salud de astronautas mediante smartwatch",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full antialiased ${rotulo.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
