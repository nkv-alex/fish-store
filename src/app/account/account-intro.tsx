"use client";

import { useLanguage } from "@/components/language-provider";

export default function AccountIntro({ signedIn }: { signedIn: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="account-intro">
      <p className="eyebrow">
        {signedIn ? t("accountSummary") : t("accountIntroEyebrow")}
      </p>
      <h1>{signedIn ? t("settingsIntroTitle") : t("accountIntroTitle")}</h1>
      <p>{signedIn ? t("settingsIntroCopy") : t("accountIntroCopy")}</p>
    </div>
  );
}
