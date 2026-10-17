import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth";

const checkoutSchema = z.object({
  email: z.email(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud JSON no válida." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa el correo y los productos." }, { status: 400 });
  }

  const quantities = new Map<string, number>();
  for (const item of parsed.data.items) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    );
  }
  if ([...quantities.values()].some((quantity) => quantity > 10)) {
    return NextResponse.json({ error: "La cantidad máxima por producto es 10." }, { status: 400 });
  }

  try {
    const prisma = getPrisma();
    const userSession = await getServerSession(authOptions);
    const email = userSession?.user.email ?? parsed.data.email;
    const products = await prisma.product.findMany({
      where: { id: { in: [...quantities.keys()] }, isActive: true },
    });
    if (products.length !== quantities.size) {
      return NextResponse.json({ error: "Uno o más productos ya no están disponibles." }, { status: 400 });
    }
    if (new Set(products.map((product) => product.currency)).size !== 1) {
      return NextResponse.json({ error: "No se pueden combinar monedas distintas." }, { status: 400 });
    }

    const total = products.reduce(
      (sum, product) => sum + product.price * (quantities.get(product.id) ?? 0),
      0,
    );
    const order = await prisma.order.create({
      data: {
        email,
        userId: userSession?.user.id,
        total,
        currency: products[0].currency,
        items: {
          create: products.map((product) => ({
            productId: product.id,
            quantity: quantities.get(product.id) ?? 0,
            unitPrice: product.price,
          })),
        },
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: products.map((product) => ({
        quantity: quantities.get(product.id),
        price_data: {
          currency: product.currency,
          unit_amount: product.price,
          product_data: {
            name: product.name,
            description: product.description,
          },
        },
      })),
      metadata: { orderId: order.id },
      success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Unable to create checkout session:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar el pago. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
