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
        <h2>Qué usamos</h2>
        <p>
          La tienda utiliza cookies técnicas de autenticación y seguridad para
          mantener la sesión, completar el inicio de sesión y proteger las
          solicitudes. Son necesarias para las funciones de cuenta y compra.
        </p>
        <p>
          El carrito temporal para volver a la tienda después de iniciar sesión se
          guarda en el almacenamiento de sesión del navegador, no en una cookie, y
          se elimina al recuperarlo o al cerrar la sesión del navegador.
        </p>
      </section>
      <section>
        <h2>Analítica y publicidad</h2>
        <p>
          La tienda no configura deliberadamente cookies de analítica ni de
          publicidad. Al cargar recursos externos (por ejemplo, tipografías o
          imágenes) o al utilizar Google y Stripe, tu navegador puede conectarse
          directamente con esos proveedores, que gestionan sus tecnologías según
          sus propias políticas.
        </p>
      </section>
      <section>
        <h2>Cómo gestionar las cookies</h2>
        <p>
          Puedes bloquear o borrar cookies desde la configuración del navegador.
          Si bloqueas las cookies técnicas, el inicio de sesión y el proceso de
          compra pueden dejar de funcionar. La tienda no usa cookies opcionales
          que requieran un panel de preferencias.
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
