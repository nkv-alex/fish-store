"use client";

import Link from "next/link";
import { StoreHeader } from "@/components/store-header";
import { useLanguage } from "@/components/language-provider";

export default function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <>
      <StoreHeader />
      <main className="not-found-page">
        <section className="not-found-card" aria-labelledby="not-found-title">
          <p className="not-found-code" aria-label="404">404</p>
          <h1 id="not-found-title">{t("notFoundTitle")}</h1>
          <p className="not-found-copy">{t("notFoundCopy")}</p>
          <div className="not-found-actions">
            <Link className="not-found-primary" href="/">
              {t("notFoundHome")}
            </Link>
            <Link className="not-found-secondary" href="/#lonja">
              {t("notFoundCatalog")}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
