import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { CartProvider } from "@/components/cart-provider";
import { CookieConsent } from "@/components/cookie-consent";
import { LanguageProvider } from "@/components/language-provider";
import { ChatWidget } from "@/components/chat-widget";
import { isLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pezcado — pescado de procedencia cuestionable",
  description: "Pescadería fina. Procedencia cuestionable. Pago seguro.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const savedLocale = (await cookies()).get("fish-store-locale")?.value;
  const locale = isLocale(savedLocale) ? savedLocale : "es";

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <LanguageProvider initialLocale={locale}>
          <CartProvider>
            <AuthSessionProvider>{children}</AuthSessionProvider>
          </CartProvider>
          <CookieConsent />
          <ChatWidget />
        </LanguageProvider>
      </body>
    </html>
  );
}
