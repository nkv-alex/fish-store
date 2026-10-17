import type { Metadata } from "next";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pezcado — pescado de procedencia cuestionable",
  description: "Pescadería fina. Procedencia cuestionable. Pago seguro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
