import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";

const registrationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().max(254).pipe(z.email()).transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(12, "La contraseña debe tener al menos 12 caracteres.")
    .max(72)
    .refine(
      (password) => Buffer.byteLength(password, "utf8") <= 72,
      "La contraseña no puede superar 72 bytes.",
    ),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud JSON no válida." }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa tus datos." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const email = parsed.data.email;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Ese correo ya tiene una cuenta. Inicia sesión." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
      },
      select: { id: true },
    });

    return NextResponse.json({ userId: user.id }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ese correo ya tiene una cuenta. Inicia sesión." },
        { status: 409 },
      );
    }
    console.error("Unable to register account:", error);
    return NextResponse.json(
      { error: "No se pudo crear la cuenta. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
