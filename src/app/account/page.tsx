import { getServerSession } from "next-auth";
import { authOptions, googleSignInEnabled } from "@/lib/auth";
import { StoreHeader } from "@/components/store-header";
import AccountForm from "./account-form";
import AccountIntro from "./account-intro";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <StoreHeader />
      <main className="account-page">
        <div className="account-layout">
          <AccountIntro />
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
