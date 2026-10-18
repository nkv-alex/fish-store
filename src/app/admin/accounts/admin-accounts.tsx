"use client";

import { useEffect, useState, type FormEvent } from "react";

type AccountRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
};

type AccountResponse = {
  users: AccountRow[];
  total: number;
  page: number;
  pageSize: number;
};

type ErrorResponse = { error?: string };

export default function AdminAccounts({ adminId }: { adminId: string }) {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [accounts, setAccounts] = useState<AccountResponse | null>(null);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q: appliedQuery, page: String(page) });
    setLoading(true);
    setError("");

    void (async () => {
      try {
        const response = await fetch(`/api/admin/users?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as AccountResponse & ErrorResponse;
        if (!response.ok) {
          throw new Error(result.error ?? "No se pudieron cargar las cuentas.");
        }
        setAccounts(result);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar las cuentas.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [appliedQuery, page, refreshKey]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedQuery(query.trim());
  }

  async function updateAccount(
    account: AccountRow,
    update: { action: "role"; role: AccountRow["role"] } | { action: "status"; isActive: boolean },
  ) {
    setPendingId(account.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.id, ...update }),
      });
      const result = (await response.json()) as ErrorResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "No se pudo actualizar la cuenta.");
      }
      setSuccess(`Cuenta de ${account.email ?? account.name ?? "usuario"} actualizada.`);
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar la cuenta.",
      );
    } finally {
      setPendingId("");
    }
  }

  const pageCount = accounts ? Math.max(1, Math.ceil(accounts.total / accounts.pageSize)) : 1;

  return (
    <section className="admin-account-panel" aria-label="Gestión de cuentas">
      <form className="admin-search" onSubmit={search}>
        <label htmlFor="account-search">Buscar por nombre o correo</label>
        <div>
          <input
            id="account-search"
            type="search"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="nombre@correo.com"
          />
          <button type="submit" disabled={loading}>Buscar</button>
        </div>
      </form>

      <div className="admin-account-summary" aria-live="polite">
        {accounts ? `${accounts.total} cuentas` : "Cargando cuentas…"}
      </div>
      {error && <p className="account-error" role="alert">{error}</p>}
      {success && <p className="account-success" role="status">{success}</p>}

      <div className="admin-table-scroll">
        <table className="admin-account-table">
          <thead>
            <tr>
              <th scope="col">Cuenta</th>
              <th scope="col">Alta</th>
              <th scope="col">Rol</th>
              <th scope="col">Acceso</th>
            </tr>
          </thead>
          <tbody>
            {accounts?.users.map((account) => {
              const isSelf = account.id === adminId;
              const isPending = pendingId === account.id;
              return (
                <tr key={account.id}>
                  <td>
                    <strong>{account.name || "Sin nombre"}</strong>
                    <span>{account.email || "Sin correo"}</span>
                    {isSelf && <small>Tu cuenta</small>}
                  </td>
                  <td>{new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(new Date(account.createdAt))}</td>
                  <td>
                    <select
                      aria-label={`Rol de ${account.email ?? account.name ?? account.id}`}
                      value={account.role}
                      disabled={isSelf || isPending}
                      onChange={(event) =>
                        void updateAccount(account, {
                          action: "role",
                          role: event.currentTarget.value === "ADMIN" ? "ADMIN" : "USER",
                        })
                      }
                    >
                      <option value="USER">Usuario</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className={`admin-status-button${account.isActive ? " active" : ""}`}
                      type="button"
                      disabled={isSelf || isPending}
                      onClick={() =>
                        void updateAccount(account, {
                          action: "status",
                          isActive: !account.isActive,
                        })
                      }
                    >
                      {isPending ? "Guardando…" : account.isActive ? "Activa · Desactivar" : "Pausada · Reactivar"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && accounts?.users.length === 0 && (
              <tr>
                <td className="admin-empty" colSpan={4}>No se encontraron cuentas.</td>
              </tr>
            )}
            {loading && !accounts && (
              <tr>
                <td className="admin-empty" colSpan={4}>Cargando cuentas…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="admin-pagination" aria-label="Paginación de cuentas">
        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>
          Anterior
        </button>
        <span>Página {page} de {pageCount}</span>
        <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount || loading}>
          Siguiente
        </button>
      </nav>
    </section>
  );
}
