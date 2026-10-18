"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AccountFormProps = {
  googleEnabled: boolean;
  user: { name: string | null | undefined; email: string | null | undefined } | null;
};

export default function AccountForm({ googleEnabled, user }: AccountFormProps) {
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
      throw new Error("No se pudo iniciar sesión. Revisa tu correo y contraseña.");
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
      setError("Las contraseñas no coinciden.");
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
          throw new Error(result.error ?? "No se pudo crear la cuenta.");
        }
      }
      await authenticate(email, password);
    } catch (formError) {
      setError(
        formError instanceof Error
          ? formError.message
          : "No se pudo completar la solicitud.",
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
      setError("No se pudo iniciar sesión con Google.");
      setPending(false);
    }
  }

  if (user) {
    return (
      <section className="account-card account-signed-in" aria-label="Tu cuenta">
        <div className="confirmation-mark">✓</div>
        <p className="eyebrow">YA ESTÁS EN CASA</p>
        <h2>Hola, {user.name || user.email}.</h2>
        <p>{user.email}</p>
        <div className="account-nav">
          <Link href="/orders">Ver mis pedidos</Link>
          <Link href="/#productos">Volver a la lonja</Link>
        </div>
        <button className="account-signout" onClick={() => signOut({ callbackUrl: "/" })}>
          Cerrar sesión
        </button>
      </section>
    );
  }

  return (
    <section className="account-card" aria-label="Acceso a tu cuenta">
      <div className="account-tabs" role="tablist" aria-label="Acceder o registrarse">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
        >
          Iniciar sesión
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
        >
          Crear cuenta
        </button>
      </div>

      <form className="account-form" onSubmit={submit}>
        {mode === "register" && (
          <label>
            Nombre
            <input name="name" type="text" autoComplete="name" required minLength={1} maxLength={100} />
          </label>
        )}
        <label>
          Correo electrónico
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label>
          Contraseña
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
            Confirmar contraseña
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
          <p className="account-help">Usa al menos 12 caracteres. Guardamos un hash seguro, nunca tu contraseña legible.</p>
        )}
        {error && <p className="account-error" role="alert">{error}</p>}
        {success && <p className="account-success" role="status">{success}</p>}
        <button className="account-submit" disabled={pending}>
          {pending
            ? "Un momento…"
            : mode === "login"
              ? "Entrar a mi cuenta"
              : "Crear mi cuenta"}
        </button>
      </form>

      <div className="account-divider"><span>O CONTINÚA CON</span></div>
      {googleEnabled ? (
        <button className="google-button" disabled={pending} onClick={googleLogin}>
          <span className="google-g" aria-hidden="true">G</span>
          Continuar con Google
        </button>
      ) : (
        <p className="account-help">
          Google estará disponible cuando se configuren GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Vercel. URI de redirección: https://fish-store-jet.vercel.app/api/auth/callback/google
        </p>
      )}
      <p className="account-help">Al continuar, aceptas que guardemos tu cuenta y el historial de pedidos en la base de datos.</p>
    </section>
  );
}
