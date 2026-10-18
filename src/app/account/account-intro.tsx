"use client";

import { useLanguage } from "@/components/language-provider";

export default function AccountIntro() {
  const { t } = useLanguage();
  return (
    <div className="account-intro">
      <p className="eyebrow">{t("accountIntroEyebrow")}</p>
      <h1>{t("accountIntroTitle")}</h1>
      <p>{t("accountIntroCopy")}</p>
    </div>
  );
}
