import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const marketPriceInput = z.object({
  commodity: z.string().trim().min(2).max(80),
  marketName: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  price: z.number().positive().max(10_000_000),
  unit: z.enum(["kg", "quintal", "tonne", "crate"]),
});

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80);
  try {
    const prices = await prisma.marketPrice.findMany({
      where: query ? {
        OR: [
          { commodity: { contains: query, mode: "insensitive" } },
          { marketName: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
        ],
      } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json({ prices });
  } catch {
    return Response.json({ error: "Market prices are unavailable because the database could not be reached." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireRole("ADMIN");
  if (response) return response;
  const parsed = marketPriceInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid commodity, market, location, price, and unit." }, { status: 400 });
  try {
    const price = await prisma.marketPrice.create({
      data: { ...parsed.data, source: "ADMIN_ENTERED", createdById: user!.id },
    });
    return Response.json({ price }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not save this market price." }, { status: 503 });
  }
}
