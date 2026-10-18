import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { StoreHeader } from "@/components/store-header";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import AccountManagement from "./account-management";
import SettingsIntro from "./settings-intro";

export const metadata: Metadata = {
  title: "Gestionar cuenta | Pezcado",
  description: "Gestiona tu perfil, contraseña y datos de cuenta de Pezcado.",
};

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) redirect("/account");

  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, passwordHash: true },
  });
  if (!user) redirect("/account");

  return (
    <>
      <StoreHeader />
      <main className="account-page">
        <div className="account-management-layout">
          <SettingsIntro />
          <AccountManagement
            name={user.name ?? ""}
            email={user.email ?? ""}
            hasPassword={Boolean(user.passwordHash)}
          />
        </div>
      </main>
    </>
  );
}
