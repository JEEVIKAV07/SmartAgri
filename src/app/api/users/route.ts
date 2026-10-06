import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { response } = await requireRole("ADMIN");
  if (response) return response;
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 });
    return Response.json({ users });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const { user, response } = await requireRole("ADMIN");
  if (response) return response;
  const parsed = z.object({ id: z.string().min(1), isActive: z.boolean() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid account update." }, { status: 400 });
  if (parsed.data.id === user!.id && !parsed.data.isActive) return Response.json({ error: "You cannot deactivate your own account." }, { status: 400 });
  try {
    const updated = await prisma.user.update({ where: { id: parsed.data.id }, data: { isActive: parsed.data.isActive }, select: { id: true, name: true, email: true, role: true, isActive: true } });
    return Response.json({ user: updated });
  } catch {
    return Response.json({ error: "Could not update account." }, { status: 404 });
  }
}