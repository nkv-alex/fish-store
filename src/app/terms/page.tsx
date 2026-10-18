import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Términos de servicio | Pezcado",
  description: "Condiciones de uso y compra de Pezcado.",
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="CONDICIONES DE USO" title="Términos de servicio">
      <section>
        <h2>El servicio</h2>
        <p>
          Pezcado ofrece un catálogo en línea y, cuando la tienda está habilitada
          para vender, un proceso de pedido y pago. El titular debe publicar sus
          datos legales, territorios de venta, condiciones de entrega y un canal
          de atención antes de aceptar pedidos del público.
        </p>
      </section>
      <section>
        <h2>Cuenta y pedidos</h2>
        <p>
          Se requiere una cuenta para comprar. Mantén tus datos actualizados y
          protege tus credenciales. El pedido se prepara con los productos,
          cantidades y precios mostrados en el carrito; el servidor verifica los
          productos y calcula el importe antes de crear la sesión segura de pago
          de Stripe.
        </p>
        <p>
          La solicitud de pago no significa que el pedido esté pagado: el estado
          se confirma una vez que Stripe comunica que el pago se completó. No
          utilices el servicio para actividades ilícitas, fraude o interferencia
          con su funcionamiento.
        </p>
      </section>
      <section>
        <h2>Precios, pago y condiciones de venta</h2>
        <p>
          Los precios y la moneda se muestran en el catálogo. Los pagos se procesan
          en Stripe Checkout; la tienda no recibe ni guarda los datos completos de
          la tarjeta. Antes de vender, el titular debe añadir las reglas aplicables
          sobre impuestos, disponibilidad, envío, cancelaciones, desistimiento,
          devoluciones y reembolsos.
        </p>
      </section>
      <section>
        <h2>Disponibilidad y responsabilidad</h2>
        <p>
          El servicio se proporciona sujeto a disponibilidad y puede cambiarse
          para mantenimiento o mejoras. Nada en estos términos limita derechos
          irrenunciables del consumidor ni responsabilidades que la ley aplicable
          no permita excluir.
        </p>
      </section>
      <section>
        <h2>Legislación y contacto</h2>
        <p>
          La legislación y los tribunales competentes deben indicarse aquí según
          la ubicación del titular y los derechos obligatorios de cada consumidor.
          Para consultas sobre estas condiciones, utiliza el canal de contacto
          que el titular publique junto a su identidad legal.
        </p>
      </section>
    </LegalPage>
  );
}
