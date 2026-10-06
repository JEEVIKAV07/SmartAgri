import { z } from "zod";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canTransitionOrder, type OrderStatus } from "@/lib/order-workflow";

export async function GET() {
  const { user, response } = await requireRole("FARMER", "BUYER", "ADMIN");
  if (response) return response;
  try {
    const orders = await prisma.order.findMany({
      where: user!.role === "ADMIN" ? {} : user!.role === "FARMER" ? { farmerId: user!.id } : { buyerId: user!.id },
      include: { listing: true, buyer: { select: { id: true, name: true } }, farmer: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ orders });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireRole("BUYER");
  if (response) return response;
  const parsed = z.object({ listingId: z.string().min(1), quantity: z.number().positive().max(1_000_000), note: z.string().trim().max(500).optional() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid quantity." }, { status: 400 });
  try {
    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId } });
    if (!listing || listing.status !== "ACTIVE") return Response.json({ error: "This listing is no longer available." }, { status: 404 });
    if (parsed.data.quantity > listing.quantity) return Response.json({ error: "Requested quantity exceeds available stock." }, { status: 400 });
    const order = await prisma.order.create({
      data: { listingId: listing.id, buyerId: user!.id, farmerId: listing.farmerId, quantity: parsed.data.quantity, unitPrice: listing.pricePerKg, total: parsed.data.quantity * listing.pricePerKg, note: parsed.data.note },
    });
    return Response.json({ order }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not place order." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const parsed = z.object({ id: z.string().min(1), status: z.enum(["ACCEPTED", "READY", "COMPLETED", "CANCELLED"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid order update." }, { status: 400 });
  try {
    const order = await prisma.order.findUnique({ where: { id: parsed.data.id } });
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    const isAllowedParty = (user.role === "FARMER" && order.farmerId === user.id) || (user.role === "BUYER" && order.buyerId === user.id && parsed.data.status === "CANCELLED");
    if (user.role !== "ADMIN" && !isAllowedParty) return Response.json({ error: "You do not have permission to update this order." }, { status: 403 });
    if (!canTransitionOrder(order.status as OrderStatus, parsed.data.status)) return Response.json({ error: `Order cannot move from ${order.status} to ${parsed.data.status}.` }, { status: 409 });
    return Response.json({ order: await prisma.order.update({ where: { id: order.id }, data: { status: parsed.data.status } }) });
  } catch {
    return Response.json({ error: "Could not update order." }, { status: 503 });
  }
}