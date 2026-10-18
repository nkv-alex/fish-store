import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de cookies | Pezcado",
  description: "Información sobre cookies y almacenamiento local en Pezcado.",
};

export default function CookiesPage() {
  return (
    <LegalPage eyebrow="TRANSPARENCIA · ALMACENAMIENTO" title="Política de cookies">
      <section>
        <h2>Cookies necesarias: sesión y cuenta</h2>
        <p>
          NextAuth utiliza cookies técnicas para iniciar y mantener la sesión de
          tu cuenta, proteger el inicio de sesión y completar los flujos de
          autenticación. La cookie de sesión contiene un token protegido que
          permite reconocer tu cuenta; no guarda tu contraseña. En HTTPS se usan
          nombres seguros como <code>__Secure-next-auth.session-token</code> y en
          desarrollo local puede aparecer <code>next-auth.session-token</code>.
          Son necesarias para acceder a la cuenta, al historial y a la compra, y
          no se pueden desactivar desde esta página.
        </p>
        <p>
          El carrito temporal para volver a la tienda después de iniciar sesión se
          guarda en el almacenamiento de sesión del navegador, no en una cookie, y
          se elimina al recuperarlo o al cerrar la sesión del navegador.
        </p>
      </section>
      <section>
        <h2>Cookie opcional de métricas</h2>
        <p>
          Solo si aceptas las métricas opcionales, guardamos la cookie propia
          <code> fish-store-cookie-consent=all</code> para recordar tu elección.
          Con esa elección, registramos únicamente totales diarios de visitas por
          una lista fija de páginas. No guardamos la dirección IP, identificadores
          de visitantes, datos de cuenta ni correo en las métricas. Si eliges
          «Solo necesarias», la cookie recuerda esa elección y no se envían
          métricas.
        </p>
        <p>
          Puedes cambiar o retirar tu elección en cualquier momento desde el
          botón «Cookies» de la parte inferior de la página. La preferencia se
          conserva durante un año.
        </p>
      </section>
      <section>
        <h2>Servicios externos</h2>
        <p>
          Al cargar recursos externos (por ejemplo, tipografías o imágenes) o
          utilizar Google y Stripe, tu navegador puede conectarse directamente
          con esos proveedores, que gestionan sus tecnologías según sus propias
          políticas.
        </p>
      </section>
      <section>
        <h2>Cómo gestionar las cookies</h2>
        <p>
          Puedes bloquear o borrar cookies desde la configuración del navegador.
          Si bloqueas las cookies técnicas, el inicio de sesión y el proceso de
          compra pueden dejar de funcionar. También puedes volver a abrir el
          panel «Cookies» para desactivar las métricas.
        </p>
      </section>
      <section>
        <h2>Más información y contacto</h2>
        <p>
          Para información sobre datos personales y derechos, consulta la{" "}
          <Link href="/privacy">política de privacidad</Link>. El titular debe publicar
          aquí su identidad legal y un canal de contacto antes de ofrecer el
          servicio al público.
        </p>
      </section>
    </LegalPage>
  );
}
