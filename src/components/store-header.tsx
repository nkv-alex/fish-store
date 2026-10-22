"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/components/language-provider";

export function StoreHeader() {
  const { t } = useLanguage();
  const { count } = useCart();

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label={t("home")}>
        pez<span>c</span>ado
      </Link>
      <nav className="main-nav" aria-label="Navegación principal">
        <Link href="/#productos">{t("fish")}</Link>
        <Link href="/orders">{t("orders")}</Link>
        <Link href="/cart" aria-label={`${t("cart")} (${count})`}>
          {t("cart")} <span className="nav-count">{count}</span>
        </Link>
      </nav>
      <Link className="account-link" href="/account">
        <span className="account-icon" aria-hidden="true">↗</span>
        <span>{t("account")}</span>
      </Link>
      <LanguageSelector />
    </header>
  );
}
