import { getServerSession } from "next-auth";
import { authOptions, googleSignInEnabled } from "@/lib/auth";
import { StoreHeader } from "@/components/store-header";
import AccountForm from "./account-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <StoreHeader />
      <main className="account-page">
        <div className="account-layout">
          <div className="account-intro">
            <p className="eyebrow">CLIENTELA DE CONFIANZA (MÁS O MENOS)</p>
            <h1>Tu lado<br />del mostrador.</h1>
            <p>Entra para seguir tus pedidos y que la próxima vez el pescado sospechoso ya te conozca.</p>
          </div>
          <AccountForm
            googleEnabled={googleSignInEnabled}
            user={
              session?.user.id
                ? {
                    id: session.user.id,
                    name: session.user.name,
                    email: session.user.email,
                    role: session.user.role,
                  }
                : null
            }
          />
        </div>
      </main>
    </>
  );
}
