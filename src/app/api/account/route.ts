import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

const passwordSchema = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres.")
  .max(72)
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "La contraseña no puede superar 72 bytes.",
  );

const updateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("profile"),
    name: z.string().trim().min(1).max(100),
  }),
  z
    .object({
      action: z.literal("password"),
      currentPassword: z.string().max(72).optional(),
      newPassword: passwordSchema,
      confirmPassword: z.string().max(72),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Las contraseñas no coinciden.",
      path: ["confirmPassword"],
    }),
]);

const deleteSchema = z.object({
  confirmation: z.literal("ELIMINAR"),
  currentPassword: z.string().max(72).optional(),
  confirmEmail: z.string().trim().max(254).optional(),
});

async function getAccountUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return null;

  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, passwordHash: true },
  });
  return user;
}

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function PATCH(request: Request) {
  const user = await getAccountUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para gestionar tu cuenta." }, { status: 401 });
  }

  const body = await readJson(request);
  if (body === null) {
    return NextResponse.json({ error: "Solicitud JSON no válida." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Revisa los datos." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  try {
    if (parsed.data.action === "profile") {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { name: parsed.data.name },
        select: { name: true },
      });
      return NextResponse.json({ name: updated.name });
    }

    if (user.passwordHash) {
      const currentPassword = parsed.data.currentPassword;
      if (
        !currentPassword ||
        !(await compare(currentPassword, user.passwordHash))
      ) {
        return NextResponse.json(
          { error: "La contraseña actual no es correcta." },
          { status: 400 },
        );
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hash(parsed.data.newPassword, 12),
        authVersion: { increment: 1 },
      },
    });
    return NextResponse.json({ passwordChanged: true });
  } catch (error) {
    console.error("Unable to update account:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la cuenta. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getAccountUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para gestionar tu cuenta." }, { status: 401 });
  }

  const body = await readJson(request);
  if (body === null) {
    return NextResponse.json({ error: "Solicitud JSON no válida." }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Escribe ELIMINAR para confirmar el cierre de la cuenta." },
      { status: 400 },
    );
  }

  if (user.passwordHash) {
    if (
      !parsed.data.currentPassword ||
      !(await compare(parsed.data.currentPassword, user.passwordHash))
    ) {
      return NextResponse.json(
        { error: "La contraseña actual no es correcta." },
        { status: 400 },
      );
    }
  } else if (
    !user.email ||
    parsed.data.confirmEmail?.trim().toLowerCase() !== user.email.toLowerCase()
  ) {
    return NextResponse.json(
      { error: "Escribe el correo de tu cuenta para confirmar el cierre." },
      { status: 400 },
    );
  }

  try {
    const prisma = getPrisma();
    await prisma.$transaction(async (transaction) => {
      await transaction.order.updateMany({
        where: { userId: user.id },
        data: {
          userId: null,
          email: "deleted-account@privacy.invalid",
        },
      });
      await transaction.user.delete({ where: { id: user.id } });
    });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Unable to delete account:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la cuenta. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
