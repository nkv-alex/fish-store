import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marea — essentials for the coast",
  description: "Una pequeña tienda de ejemplo con pagos seguros en Stripe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
