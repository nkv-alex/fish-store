import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

const pageSize = 25;
const searchSchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
});

const updateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("role"),
    userId: z.cuid(),
    role: z.enum(["USER", "ADMIN"]),
  }),
  z.object({
    action: z.literal("status"),
    userId: z.cuid(),
    isActive: z.boolean(),
  }),
]);

type AdminAuthorization =
  | { ok: true; adminId: string }
  | { ok: false; response: NextResponse };

async function authorizeAdmin(): Promise<AdminAuthorization> {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Inicia sesión para acceder al panel." },
        { status: 401 },
      ),
    };
  }

  const currentUser = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { role: true, isActive: true },
  });
  if (!currentUser?.isActive) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "La cuenta no está activa." },
        { status: 403 },
      ),
    };
  }
  if (currentUser.role !== "ADMIN") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "No tienes permisos de administrador." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, adminId: session.user.id };
}

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authorization = await authorizeAdmin();
    if (!authorization.ok) return authorization.response;

    const url = new URL(request.url);
    const parsedQuery = searchSchema.safeParse({
      q: url.searchParams.get("q") ?? "",
      page: url.searchParams.get("page") ?? "1",
    });
    if (!parsedQuery.success) {
      return NextResponse.json({ error: "Búsqueda o página no válidas." }, { status: 400 });
    }

    const { q, page } = parsedQuery.data;
    const where = q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};
    const prisma = getPrisma();
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json(
      { users, total, page, pageSize },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unable to load administrator account list:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las cuentas." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const authorization = await authorizeAdmin();
    if (!authorization.ok) return authorization.response;

    const body = await readJson(request);
    if (body === null) {
      return NextResponse.json({ error: "Solicitud JSON no válida." }, { status: 400 });
    }
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Revisa los datos de la cuenta." }, { status: 400 });
    }

    const update = parsed.data;
    const result = await getPrisma().$transaction(
      async (transaction) => {
        const actingAdmin = await transaction.user.findUnique({
          where: { id: authorization.adminId },
          select: { role: true, isActive: true },
        });
        if (!actingAdmin?.isActive || actingAdmin.role !== "ADMIN") {
          return { kind: "not-authorized" as const };
        }

        const target = await transaction.user.findUnique({
          where: { id: update.userId },
          select: { id: true, role: true, isActive: true },
        });
        if (!target) return { kind: "not-found" as const };

        const roleChange = update.action === "role" && target.role !== update.role;
        const statusChange = update.action === "status" && target.isActive !== update.isActive;
        if (!roleChange && !statusChange) return { kind: "unchanged" as const };
        if (target.id === authorization.adminId) return { kind: "self-change" as const };

        const willRemoveActiveAdmin =
          target.role === "ADMIN" &&
          target.isActive &&
          ((update.action === "role" && update.role !== "ADMIN") ||
            (update.action === "status" && !update.isActive));
        if (willRemoveActiveAdmin) {
          const activeAdmins = await transaction.user.count({
            where: { role: "ADMIN", isActive: true },
          });
          if (activeAdmins <= 1) return { kind: "last-admin" as const };
        }

        const data =
          update.action === "role"
            ? { role: update.role, authVersion: { increment: 1 } }
            : { isActive: update.isActive, authVersion: { increment: 1 } };
        const user = await transaction.user.update({
          where: { id: target.id },
          data,
          select: { id: true, role: true, isActive: true },
        });
        return { kind: "updated" as const, user };
      },
      { isolationLevel: "Serializable" },
    );

    if (result.kind === "not-found") {
      return NextResponse.json({ error: "La cuenta no existe." }, { status: 404 });
    }
    if (result.kind === "not-authorized") {
      return NextResponse.json(
        { error: "El acceso de administrador ha cambiado. Inicia sesión de nuevo." },
        { status: 403 },
      );
    }
    if (result.kind === "self-change") {
      return NextResponse.json(
        { error: "No puedes cambiar tu propio rol o estado desde este panel." },
        { status: 400 },
      );
    }
    if (result.kind === "last-admin") {
      return NextResponse.json(
        { error: "Debe permanecer al menos una cuenta de administrador activa." },
        { status: 409 },
      );
    }
    return NextResponse.json({ user: result.kind === "updated" ? result.user : null });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "La cuenta cambió durante la operación. Recarga y vuelve a intentarlo." },
        { status: 409 },
      );
    }
    console.error("Unable to update administrator account:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la cuenta." },
      { status: 500 },
    );
  }
}
