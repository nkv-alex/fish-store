import Link from "next/link";
import { cookies } from "next/headers";
import { isLocale, translate } from "@/lib/i18n";

export default async function CancelledPage() {
  const savedLocale = (await cookies()).get("fish-store-locale")?.value;
  const t = (key: Parameters<typeof translate>[1]) =>
    translate(isLocale(savedLocale) ? savedLocale : "es", key);

  return (
    <main className="confirmation">
      <a className="brand" href="/">pez<span>c</span>ado</a>
      <div className="confirmation-mark muted">↶</div>
      <p className="eyebrow">{t("cancelledEyebrow")}</p>
      <h1>{t("cancelledTitle")}</h1>
      <p className="confirmation-copy">{t("cancelledCopy")}</p>
      <Link className="checkout-button back-link" href="/">{t("backToStore")}</Link>
    </main>
  );
}
