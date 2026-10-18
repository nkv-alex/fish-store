import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const pagePaths = [
  "/",
  "/account",
  "/orders",
  "/privacy",
  "/cookies",
  "/terms",
  "/order/success",
  "/order/cancelled",
] as const;

const metricSchema = z.object({
  path: z.enum(pagePaths),
});

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("fish-store-cookie-consent")?.value !== "all") {
    return NextResponse.json(
      { error: "Se requiere consentimiento para las métricas." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud JSON no válida." }, { status: 400 });
  }

  const parsed = metricSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Página no válida." }, { status: 400 });
  }

  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);

  try {
    await getPrisma().dailyPageMetric.upsert({
      where: { day_path: { day, path: parsed.data.path } },
      create: { day, path: parsed.data.path },
      update: { views: { increment: 1 } },
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unable to record anonymous page metric:", error);
    return NextResponse.json(
      { error: "No se pudo guardar la métrica." },
      { status: 500 },
    );
  }
}
