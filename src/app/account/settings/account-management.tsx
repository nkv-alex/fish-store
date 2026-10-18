"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

type AccountManagementProps = {
  name: string;
  email: string;
  hasPassword: boolean;
};

export default function AccountManagement({
  name,
  email,
  hasPassword,
}: AccountManagementProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function send(
    method: "PATCH" | "DELETE",
    body: Record<string, string>,
  ) {
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/account", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result: { error?: string; name?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? t("accountUpdateError"));
      }
      return result;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t("requestError"),
      );
      return null;
    } finally {
      setPending(false);
    }
  }

  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await send("PATCH", {
      action: "profile",
      name: String(form.get("name")),
    });
    if (result) {
      setSuccess(t("profileUpdated"));
      router.refresh();
    }
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword"));
    const confirmPassword = String(form.get("confirmPassword"));
    if (newPassword !== confirmPassword) {
      setError(t("passwordNewMismatch"));
      return;
    }

    const body: Record<string, string> = {
      action: "password",
      newPassword,
      confirmPassword,
    };
    if (hasPassword) body.currentPassword = String(form.get("currentPassword"));

    const result = await send("PATCH", body);
    if (result) await signOut({ callbackUrl: "/account" });
  }

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: Record<string, string> = {
      confirmation:
        String(form.get("confirmation")) === t("deleteKeyword")
          ? "ELIMINAR"
          : String(form.get("confirmation")),
    };
    if (hasPassword) {
      body.currentPassword = String(form.get("deletePassword"));
    } else {
      body.confirmEmail = String(form.get("confirmEmail"));
    }

    const result = await send("DELETE", body);
    if (result) await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="account-management">
      <section className="account-management-card">
        <p className="eyebrow">{t("profileData")}</p>
        <h2>{t("yourProfile")}</h2>
        <p className="account-management-email">{t("accessEmail")} {email}</p>
        <form className="account-form" onSubmit={updateProfile}>
          <label>
            {t("name")}
            <input
              name="name"
              type="text"
              autoComplete="name"
              required
              minLength={1}
              maxLength={100}
              defaultValue={name}
            />
          </label>
          <button className="account-submit" disabled={pending}>{t("saveProfile")}</button>
        </form>
      </section>

      <section className="account-management-card">
        <p className="eyebrow">{t("security")}</p>
        <h2>{hasPassword ? t("changePassword") : t("addPassword")}</h2>
        {!hasPassword && (
          <p className="account-management-email">
            {t("googleAccount")}
          </p>
        )}
        <form className="account-form" onSubmit={updatePassword}>
          {hasPassword && (
            <label>
              {t("currentPassword")}
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={72}
              />
            </label>
          )}
          <label>
            {t("newPassword")}
            <input
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
            />
          </label>
          <label>
            {t("confirmNewPassword")}
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
            />
          </label>
          <p className="account-help">{t("sessionsRevoked")}</p>
          <button className="account-submit" disabled={pending}>
            {hasPassword ? t("updatePassword") : t("createPassword")}
          </button>
        </form>
      </section>

      <section className="account-management-card account-danger-zone">
        <p className="eyebrow">{t("irreversible")}</p>
        <h2>{t("deleteAccount")}</h2>
        <p>{t("deleteAccountCopy")}</p>
        <form className="account-form" onSubmit={deleteAccount}>
          {hasPassword ? (
            <label>
              Contraseña actual
              <input
                name="deletePassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={72}
              />
            </label>
          ) : (
            <label>
              {t("enterEmail")}
              <input
                name="confirmEmail"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                defaultValue=""
              />
            </label>
          )}
          <label>
            {t("typeDelete")}
            <input name="confirmation" type="text" required />
          </label>
          <button className="account-delete-button" disabled={pending}>
            {t("deleteAccountButton")}
          </button>
        </form>
      </section>

      {error && <p className="account-error" role="alert">{error}</p>}
      {success && <p className="account-success" role="status">{success}</p>}
    </div>
  );
}
