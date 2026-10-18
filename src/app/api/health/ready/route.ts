import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ready" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Application readiness check failed:", error);
    return Response.json(
      { status: "not_ready" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
