import Link from "next/link";
import { StoreHeader } from "@/components/store-header";

export function LegalPage({
  eyebrow,
  title,
  children,
}: Readonly<{
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <>
      <StoreHeader />
      <main className="legal-page">
        <article className="legal-content">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-updated">Última actualización: 18 de octubre de 2026</p>
          <aside className="legal-notice">
            Antes de publicar la tienda, el titular debe completar y verificar su
            identidad legal, domicilio, correo de contacto y jurisdicción, además
            de las condiciones de envío, desistimiento y devoluciones aplicables.
            Este texto informativo no sustituye asesoramiento jurídico.
          </aside>
          {children}
        </article>
      </main>
      <footer>
        <Link className="brand" href="/">pez<span>c</span>ado</Link>
        <nav className="legal-links" aria-label="Información legal">
          <Link href="/privacy">Privacidad</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/terms">Términos de servicio</Link>
        </nav>
      </footer>
    </>
  );
}
