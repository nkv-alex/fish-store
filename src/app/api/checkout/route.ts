import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth";

const checkoutSchema = z.object({
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

function isLoopbackUrl(url: URL) {
  return ["localhost", "127.0.0.1", "::1"].includes(
    url.hostname.replace(/^\[|\]$/g, ""),
  );
}

function getPublicBaseUrl(request: Request) {
  const configuredUrls = [
    process.env.NEXT_PUBLIC_APP_URL?.trim(),
    process.env.NEXTAUTH_URL?.trim(),
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.trim()}`
      : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("The public app URL must use HTTP or HTTPS.");
      }
      return url;
    });
  const publicUrl = configuredUrls.find((url) => !isLoopbackUrl(url));
  const requestUrl = new URL(request.url);
  if (publicUrl) {
    if (
      process.env.NODE_ENV === "production" &&
      isLoopbackUrl(publicUrl) &&
      !isLoopbackUrl(requestUrl)
    ) {
      throw new Error(
        "Stripe checkout cannot use a localhost URL for a public production request.",
      );
    }
    if (
      process.env.NODE_ENV === "production" &&
      !isLoopbackUrl(publicUrl) &&
      publicUrl.protocol !== "https:"
    ) {
      throw new Error("The public app URL must use HTTPS in production.");
    }
    return publicUrl.origin;
  }
  if (process.env.NODE_ENV === "production") {
    if (!isLoopbackUrl(requestUrl)) {
      throw new Error(
        "Set NEXT_PUBLIC_APP_URL or NEXTAUTH_URL to the public app URL before creating Stripe checkout sessions.",
      );
    }
  }
  return configuredUrls[0]?.origin ?? requestUrl.origin;
}

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
    const userSession = await getServerSession(authOptions);
    if (!userSession?.user.id || !userSession.user.email) {
      return NextResponse.json(
        { error: "Inicia sesión o crea una cuenta para comprar." },
        { status: 401 },
      );
    }
    const baseUrl = getPublicBaseUrl(request);
    const prisma = getPrisma();
    const email = userSession.user.email;
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
        userId: userSession.user.id,
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
      cancel_url: `${baseUrl}/order/cancelled`,
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
