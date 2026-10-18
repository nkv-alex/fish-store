"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

type AccountFormProps = {
  googleEnabled: boolean;
  user: {
    id: string;
    name: string | null | undefined;
    email: string | null | undefined;
    role: "USER" | "ADMIN";
  } | null;
};

export default function AccountForm({ googleEnabled, user }: AccountFormProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { update } = useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function getCallbackUrl() {
    const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
    if (!callbackUrl) return "/orders";

    try {
      const destination = new URL(callbackUrl, window.location.origin);
      if (destination.origin !== window.location.origin) return "/orders";
      return `${destination.pathname}${destination.search}${destination.hash}`;
    } catch {
      return "/orders";
    }
  }

  async function authenticate(email: string, password: string) {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (result?.error || !result?.ok) {
      throw new Error(t("signInError"));
    }
    await update();
    router.replace(getCallbackUrl());
    router.refresh();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    if (mode === "register" && password !== String(form.get("confirmPassword"))) {
      setError(t("passwordMismatch"));
      setPending(false);
      return;
    }

    try {
      if (mode === "register") {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            email,
            password,
          }),
        });
        const result: { error?: string } = await response.json();
        if (!response.ok) {
          throw new Error(result.error ?? t("createAccountError"));
        }
      }
      await authenticate(email, password);
    } catch (formError) {
      setError(
        formError instanceof Error
          ? formError.message
          : t("requestError"),
      );
      setPending(false);
    }
  }

  async function googleLogin() {
    setPending(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: getCallbackUrl() });
    } catch {
      setError(t("googleLoginError"));
      setPending(false);
    }
  }

  if (user?.id) {
    return (
      <section className="account-card account-signed-in" aria-label={t("yourAccount")}>
        <div className="confirmation-mark">✓</div>
        <p className="eyebrow">{t("welcomeBack")}</p>
        <h2>Hola, {user.name || user.email}.</h2>
        <p>{user.email}</p>
        <div className="account-nav">
          <Link href="/account/settings">{t("manageAccount")}</Link>
          {user.role === "ADMIN" && <Link href="/admin/accounts">{t("adminPanel")}</Link>}
          <Link href="/orders">{t("viewOrders")}</Link>
          <Link href="/#productos">{t("returnStore")}</Link>
        </div>
        <button className="account-signout" onClick={() => signOut({ callbackUrl: "/" })}>
          {t("signOut")}
        </button>
      </section>
    );
  }

  return (
    <section className="account-card" aria-label={t("yourAccount")}>
      <div className="account-tabs" role="tablist" aria-label={`${t("login")} / ${t("register")}`}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
        >
          {t("login")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
        >
          {t("register")}
        </button>
      </div>

      <form className="account-form" onSubmit={submit}>
        {mode === "register" && (
          <label>
            {t("name")}
            <input name="name" type="text" autoComplete="name" required minLength={1} maxLength={100} />
          </label>
        )}
        <label>
          {t("email")}
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label>
          {t("password")}
          <input
            name="password"
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
            minLength={mode === "register" ? 12 : 1}
            maxLength={72}
          />
        </label>
        {mode === "register" && (
          <label>
            {t("confirmPassword")}
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
            />
          </label>
        )}
        {mode === "register" && (
          <p className="account-help">{t("passwordHelp")}</p>
        )}
        {error && <p className="account-error" role="alert">{error}</p>}
        {success && <p className="account-success" role="status">{success}</p>}
        <button className="account-submit" disabled={pending}>
          {pending
            ? t("pleaseWait")
            : mode === "login"
              ? t("loginSubmit")
              : t("registerSubmit")}
        </button>
      </form>

      <div className="account-divider"><span>{t("continueWith")}</span></div>
      {googleEnabled ? (
        <button className="google-button" disabled={pending} onClick={googleLogin}>
          <span className="google-g" aria-hidden="true">G</span>
          {t("continueGoogle")}
        </button>
      ) : (
        <p className="account-help">
          {t("googleSetup")} <span>URI: https://fish-store-jet.vercel.app/api/auth/callback/google</span>
        </p>
      )}
      <p className="account-help">{t("accountConsent")}</p>
    </section>
  );
}
