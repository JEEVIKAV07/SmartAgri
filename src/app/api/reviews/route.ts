import { z } from "zod";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { response } = await requireRole("ADMIN");
  if (response) return response;
  try {
    return Response.json({ reviews: await prisma.review.findMany({ include: { buyer: { select: { name: true } }, farmer: { select: { name: true } }, order: { include: { listing: true } } }, orderBy: { createdAt: "desc" } }) });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireRole("BUYER");
  if (response) return response;
  const parsed = z.object({ orderId: z.string().min(1), rating: z.number().int().min(1).max(5), body: z.string().trim().min(3).max(1200) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a rating and a review of at least 3 characters." }, { status: 400 });
  try {
    const order = await prisma.order.findFirst({ where: { id: parsed.data.orderId, buyerId: user!.id, status: "COMPLETED" } });
    if (!order) return Response.json({ error: "Only completed orders can be reviewed." }, { status: 403 });
    const review = await prisma.review.create({ data: { ...parsed.data, buyerId: user!.id, farmerId: order.farmerId } });
    return Response.json({ review }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not submit review. This order may already have a review." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return Response.json({ error: "Administrator access required." }, { status: user ? 403 : 401 });
  const parsed = z.object({ id: z.string().min(1), status: z.enum(["PUBLISHED", "HIDDEN"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid moderation action." }, { status: 400 });
  try {
    return Response.json({ review: await prisma.review.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } }) });
  } catch {
    return Response.json({ error: "Could not update review." }, { status: 503 });
  }
}