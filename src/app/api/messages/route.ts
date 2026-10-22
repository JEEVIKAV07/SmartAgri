import { z } from "zod";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const conversationId = new URL(request.url).searchParams.get("conversationId");
  try {
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ buyerId: user.id }, { farmerId: user.id }] },
      include: { listing: true, buyer: { select: { id: true, name: true } }, farmer: { select: { id: true, name: true } }, messages: { orderBy: { createdAt: "desc" }, take: 100 } },
      orderBy: { createdAt: "desc" },
    });
    const selectedConversations = conversationId ? conversations.filter((item) => item.id === conversationId) : conversations;
    return Response.json({ conversations: selectedConversations.map((item) => ({ ...item, messages: item.messages.reverse() })) });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireRole("BUYER", "FARMER");
  if (response) return response;
  if (!(await checkRateLimit(request, "message", 20, 60_000))) return Response.json({ error: "Too many messages. Try again in a minute." }, { status: 429 });
  const parsed = z.object({ listingId: z.string().min(1), body: z.string().trim().min(1).max(2000), conversationId: z.string().optional() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Message must be 1 to 2,000 characters." }, { status: 400 });
  try {
    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId }, select: { farmerId: true } });
    if (!listing) return Response.json({ error: "Listing not found." }, { status: 404 });
    if (!parsed.data.conversationId && listing.farmerId === user!.id) {
      return Response.json({ error: "You cannot start a conversation with yourself." }, { status: 400 });
    }
    const conversation = parsed.data.conversationId
      ? await prisma.conversation.findFirst({
        where: {
          id: parsed.data.conversationId,
          listingId: parsed.data.listingId,
          OR: [{ buyerId: user!.id }, { farmerId: user!.id }],
        },
      })
      : await prisma.conversation.upsert({
        where: { id: `${user!.id}:${parsed.data.listingId}` },
        create: {
          id: `${user!.id}:${parsed.data.listingId}`,
          buyerId: user!.id,
          farmerId: listing.farmerId,
          listingId: parsed.data.listingId,
        },
        update: {},
      });
    if (!conversation) return Response.json({ error: "Conversation not found." }, { status: 404 });
    const message = await prisma.message.create({ data: { conversationId: conversation.id, senderId: user!.id, body: parsed.data.body } });
    return Response.json({ conversationId: conversation.id, message }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not send message." }, { status: 503 });
  }
}