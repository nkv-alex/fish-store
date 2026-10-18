import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad | Pezcado",
  description: "Información sobre los datos personales tratados por Pezcado.",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="TRANSPARENCIA · DATOS PERSONALES" title="Política de privacidad">
      <section>
        <h2>Quién trata tus datos</h2>
        <p>
          El responsable es el titular de la tienda Pezcado. Su razón social,
          domicilio y datos de contacto deben completarse antes de ofrecer el
          servicio al público. Para consultas o para ejercer tus derechos, utiliza
          el canal de contacto que el titular publique junto con esos datos.
        </p>
      </section>
      <section>
        <h2>Qué datos y para qué</h2>
        <ul>
          <li>
            Al crear una cuenta: nombre, correo electrónico y credenciales
            protegidas mediante hash; si eliges Google, los datos básicos del
            perfil que Google comparte para iniciar sesión.
          </li>
          <li>
            Al hacer un pedido: cuenta asociada, productos, cantidades, importes,
            moneda, estado e identificadores de la sesión de pago. Usamos estos
            datos para tramitar el pedido, mostrar su historial y atender consultas.
          </li>
          <li>
            Para el pago, Stripe Checkout procesa la información necesaria. Los
            datos de tarjeta se introducen en Stripe y no se almacenan en esta
            tienda.
          </li>
          <li>
            Los datos técnicos imprescindibles se utilizan para mantener la
            sesión, proteger el servicio y prevenir usos indebidos.
          </li>
          <li>
            Solo si aceptas las métricas opcionales: recuentos diarios agregados
            por página. No se almacenan direcciones IP, identificadores de
            visitantes, correos electrónicos ni identificadores de cuenta en
            esos registros.
          </li>
        </ul>
      </section>
      <section>
        <h2>Proveedores y conservación</h2>
        <p>
          El servicio utiliza proveedores de alojamiento y base de datos, Google
          cuando eliges el inicio de sesión OAuth y Stripe para el pago. Estos
          proveedores reciben los datos necesarios para prestar sus servicios y
          pueden tratarlos conforme a sus propias condiciones y políticas.
        </p>
        <p>
          Conservamos los datos mientras la cuenta y los pedidos estén activos y,
          después, durante el tiempo necesario para cumplir obligaciones legales,
          resolver incidencias o defender reclamaciones. El titular debe concretar
          los plazos exigidos en los territorios donde opere.
        </p>
      </section>
      <section>
        <h2>Tus derechos</h2>
        <p>
          Según la normativa aplicable, puedes solicitar acceso, rectificación,
          supresión, limitación, oposición o portabilidad, y retirar un
          consentimiento cuando el tratamiento se base en él. Dirige tu solicitud
          al contacto del responsable, que debe publicarse en esta página. También
          puedes reclamar ante la autoridad de protección de datos competente.
        </p>
      </section>
      <section>
        <h2>Seguridad y cambios</h2>
        <p>
          Aplicamos medidas técnicas para proteger las cuentas y los pedidos, pero
          ningún sistema conectado a internet puede garantizar seguridad absoluta.
          Si cambia el tratamiento de datos, actualizaremos esta política e
          indicaremos la fecha de revisión.
        </p>
      </section>
    </LegalPage>
  );
}
