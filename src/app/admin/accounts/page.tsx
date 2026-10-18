import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import AdminAccounts from "./admin-accounts";

export const metadata: Metadata = {
  title: "Administrar cuentas | Pezcado",
  description: "Gestiona las cuentas de usuario y administradores.",
};

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) redirect("/account");

  const currentUser = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });
  if (!currentUser?.isActive || currentUser.role !== "ADMIN") redirect("/account");

  return (
    <>
      <StoreHeader />
      <main className="admin-page">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">ADMINISTRACIÓN</p>
            <h1>Cuentas.</h1>
            <p>Busca cuentas, administra los permisos y controla el acceso.</p>
          </div>
          <Link className="admin-back-link" href="/account">Volver a mi cuenta</Link>
        </div>
        <AdminAccounts adminId={session.user.id} />
      </main>
    </>
  );
}
