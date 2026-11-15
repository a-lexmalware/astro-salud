import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Órbita Vital | Salud de la tripulación",
  description: "Monitoreo en tiempo real de la salud de astronautas mediante smartwatch",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
