import { z } from "zod";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderTransitionError, transitionOrderWithInventory, type OrderStatus } from "@/lib/order-workflow";
import { canBuyerMarkPayment, canCancelOrderForPayment, canFarmerConfirmPayment } from "@/lib/payment-workflow";

export async function GET() {
  const { user, response } = await requireRole("FARMER", "BUYER", "ADMIN");
  if (response) return response;
  try {
    const orders = await prisma.order.findMany({
      where: user!.role === "ADMIN" ? {} : user!.role === "FARMER"
        ? { OR: [{ farmerId: user!.id }, { buyerId: user!.id }] }
        : { buyerId: user!.id },
      include: { listing: true, buyer: { select: { id: true, name: true } }, farmer: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ orders });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireRole("BUYER", "FARMER");
  if (response) return response;
  const parsed = z.object({
    listingId: z.string().min(1),
    quantity: z.number().positive().max(1_000_000),
    note: z.string().trim().max(500).optional(),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid quantity." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id: parsed.data.listingId } });
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (!listing || listing.status !== "ACTIVE" || (listing.availableUntil && listing.availableUntil < today)) {
        return { error: "This listing is no longer available.", status: 404 } as const;
      }
      if (listing.farmerId === user!.id) {
        return { error: "You cannot place an order on your own listing.", status: 400 } as const;
      }
      if (parsed.data.quantity > listing.quantity) {
        return { error: "Requested quantity exceeds available stock.", status: 400 } as const;
      }
      const order = await tx.order.create({
        data: {
          listingId: listing.id,
          buyerId: user!.id,
          farmerId: listing.farmerId,
          quantity: parsed.data.quantity,
          unitPrice: listing.pricePerKg,
          total: parsed.data.quantity * listing.pricePerKg,
          note: parsed.data.note,
        },
      });
      return { order } as const;
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result, { status: 201 });
  } catch {
    return Response.json({ error: "Could not place order." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const parsed = z.object({
    id: z.string().min(1),
    status: z.enum(["ACCEPTED", "READY", "COMPLETED", "CANCELLED"]).optional(),
    paymentAction: z.enum(["MARK_PAID", "CONFIRM_PAYMENT"]).optional(),
  }).refine((data) => Number(data.status !== undefined) + Number(data.paymentAction !== undefined) === 1)
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid order update." }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: parsed.data.id } });
      if (!order) return { error: "Order not found.", status: 404 } as const;

      if (parsed.data.paymentAction) {
        const canMarkPaid = parsed.data.paymentAction === "MARK_PAID"
          && ["BUYER", "FARMER"].includes(user.role)
          && order.buyerId === user.id
          && canBuyerMarkPayment(order);
        const canConfirmPayment = parsed.data.paymentAction === "CONFIRM_PAYMENT"
          && user.role === "FARMER"
          && order.farmerId === user.id
          && canFarmerConfirmPayment(order);
        if (!canMarkPaid && !canConfirmPayment) {
          return { error: "This payment action is not available for your account or this order.", status: 403 } as const;
        }
        const updated = await tx.order.updateMany({
          where: {
            id: order.id,
            paymentStatus: "INCOMPLETE",
            status: { in: ["READY", "COMPLETED"] },
            ...(canMarkPaid ? { buyerPaymentMarkedAt: null } : { buyerPaymentMarkedAt: { not: null } }),
          },
          data: canMarkPaid
            ? { buyerPaymentMarkedAt: new Date() }
            : { paymentStatus: "COMPLETED", paymentCompletedAt: new Date() },
        });
        if (updated.count !== 1) return { error: "The payment changed while you were updating it. Refresh and try again.", status: 409 } as const;
        return { order: await tx.order.findUniqueOrThrow({ where: { id: order.id } }) } as const;
      }

      const nextStatus = parsed.data.status!;
      if (nextStatus === "CANCELLED" && !canCancelOrderForPayment(order)) {
        return { error: "This order cannot be cancelled after payment was marked. Coordinate any refund directly with the other party.", status: 409 } as const;
      }
      const isAllowedParty = (user.role === "FARMER" && order.farmerId === user.id && nextStatus !== "COMPLETED")
        || (["BUYER", "FARMER"].includes(user.role) && order.buyerId === user.id && ["CANCELLED", "COMPLETED"].includes(nextStatus));
      if (user.role !== "ADMIN" && !isAllowedParty) {
        return { error: "You do not have permission to update this order.", status: 403 } as const;
      }

      await transitionOrderWithInventory({
        reserveStock: async (listingId, quantity) => {
          const result = await tx.listing.updateMany({
            where: { id: listingId, quantity: { gte: quantity } },
            data: { quantity: { decrement: quantity } },
          });
          return result.count === 1;
        },
        releaseStock: async (listingId, quantity) => {
          await tx.listing.update({ where: { id: listingId }, data: { quantity: { increment: quantity } } });
        },
        updateStatus: async (orderId, from, to) => {
          const result = await tx.order.updateMany({
            where: { id: orderId, status: from },
            data: { status: to },
          });
          return result.count === 1;
        },
      }, order, nextStatus as OrderStatus);

      return { order: await tx.order.findUniqueOrThrow({ where: { id: order.id } }) } as const;
    });
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result);
  } catch (error) {
    if (error instanceof OrderTransitionError) {
      const message = error.reason === "INSUFFICIENT_STOCK"
        ? "This order cannot be accepted because the requested quantity is no longer available."
        : error.reason === "CONCURRENT_UPDATE"
          ? "This order changed while you were updating it. Refresh and try again."
          : "This order cannot make that status transition.";
      return Response.json({ error: message }, { status: 409 });
    }
    return Response.json({ error: "Could not update order." }, { status: 503 });
  }
}