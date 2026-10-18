"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
        throw new Error(result.error ?? "No se pudo actualizar la cuenta.");
      }
      return result;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo completar la solicitud.",
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
      setSuccess("Tu nombre se ha actualizado.");
      router.refresh();
    }
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword"));
    const confirmPassword = String(form.get("confirmPassword"));
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
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
      confirmation: String(form.get("confirmation")),
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
        <p className="eyebrow">DATOS PERSONALES</p>
        <h2>Tu perfil.</h2>
        <p className="account-management-email">Correo de acceso: {email}</p>
        <form className="account-form" onSubmit={updateProfile}>
          <label>
            Nombre
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
          <button className="account-submit" disabled={pending}>Guardar perfil</button>
        </form>
      </section>

      <section className="account-management-card">
        <p className="eyebrow">ACCESO Y SEGURIDAD</p>
        <h2>{hasPassword ? "Cambiar contraseña." : "Añadir contraseña."}</h2>
        {!hasPassword && (
          <p className="account-management-email">
            Tu cuenta se creó con Google. Puedes añadir una contraseña para
            iniciar sesión también con correo.
          </p>
        )}
        <form className="account-form" onSubmit={updatePassword}>
          {hasPassword && (
            <label>
              Contraseña actual
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
            Contraseña nueva
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
            Confirmar contraseña nueva
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
            />
          </label>
          <p className="account-help">Al cambiarla, se cerrarán las demás sesiones de tu cuenta.</p>
          <button className="account-submit" disabled={pending}>
            {hasPassword ? "Actualizar contraseña" : "Crear contraseña"}
          </button>
        </form>
      </section>

      <section className="account-management-card account-danger-zone">
        <p className="eyebrow">ACCIONES IRREVERSIBLES</p>
        <h2>Eliminar cuenta.</h2>
        <p>
          Tu perfil, acceso y datos de cuenta se eliminarán. Los pedidos que
          deban conservarse se desvincularán y su correo se anonimizará.
        </p>
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
              Escribe tu correo para confirmar
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
            Escribe ELIMINAR para confirmar
            <input name="confirmation" type="text" required pattern="ELIMINAR" />
          </label>
          <button className="account-delete-button" disabled={pending}>
            Eliminar mi cuenta
          </button>
        </form>
      </section>

      {error && <p className="account-error" role="alert">{error}</p>}
      {success && <p className="account-success" role="status">{success}</p>}
    </div>
  );
}
