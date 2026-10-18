"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

export default function SettingsIntro() {
  const { t } = useLanguage();

  return (
    <div className="account-intro">
      <p className="eyebrow">{t("settingsEyebrow")}</p>
      <h1>{t("settingsIntroTitle")}</h1>
      <p>{t("settingsIntroCopy")}</p>
      <nav className="account-management-nav" aria-label={t("account")}>
        <Link href="/account">{t("accountSummary")}</Link>
        <Link href="/orders">{t("viewOrders")}</Link>
        <Link href="/">{t("backToStore")}</Link>
      </nav>
    </div>
  );
}
