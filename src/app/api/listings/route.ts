import { z } from "zod";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const listingInput = z.object({
  crop: z.string().trim().min(2).max(80),
  variety: z.string().trim().max(80).optional(),
  quantity: z.number().positive().max(1_000_000),
  unit: z.enum(["kg", "crate", "tonne"]).default("kg"),
  pricePerKg: z.number().positive().max(10_000_000),
  location: z.string().trim().min(2).max(120),
  harvestDate: z.string().date().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const crop = url.searchParams.get("crop");
  const user = await getCurrentUser();
  try {
    const listings = await prisma.listing.findMany({
      where: {
        OR: [
          { status: "ACTIVE" },
          ...(user?.role === "FARMER" ? [{ farmerId: user.id }] : []),
        ],
        ...(crop && crop !== "All crops" ? { crop } : {}),
        ...(search ? { OR: [{ crop: { contains: search, mode: "insensitive" } }, { location: { contains: search, mode: "insensitive" } }] } : {}),
      },
      include: { farmer: { select: { id: true, name: true, village: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return Response.json({ listings });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireRole("FARMER");
  if (response) return response;
  const parsed = listingInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the listing details and try again." }, { status: 400 });
  try {
    const listing = await prisma.listing.create({
      data: { ...parsed.data, farmerId: user!.id, harvestDate: parsed.data.harvestDate ? new Date(parsed.data.harvestDate) : undefined },
    });
    return Response.json({ listing }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not save listing. Check the database connection." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const parsed = z.object({
    id: z.string().min(1),
    status: z.enum(["ACTIVE", "PAUSED", "REMOVED"]).optional(),
    crop: z.string().trim().min(2).max(80).optional(),
    variety: z.string().trim().max(80).optional(),
    quantity: z.number().positive().max(1_000_000).optional(),
    unit: z.enum(["kg", "crate", "tonne"]).optional(),
    pricePerKg: z.number().positive().max(10_000_000).optional(),
    location: z.string().trim().min(2).max(120).optional(),
    harvestDate: z.string().date().optional(),
  }).refine(({ status, ...details }) => status !== undefined || Object.values(details).some((value) => value !== undefined)).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid listing update." }, { status: 400 });
  try {
    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.id }, select: { farmerId: true } });
    if (!listing) return Response.json({ error: "Listing not found." }, { status: 404 });
    if (user.role !== "ADMIN" && (user.role !== "FARMER" || listing.farmerId !== user.id)) return Response.json({ error: "You do not have permission to update this listing." }, { status: 403 });
    const { id, harvestDate, ...changes } = parsed.data;
    return Response.json({ listing: await prisma.listing.update({
      where: { id },
      data: { ...changes, ...(harvestDate ? { harvestDate: new Date(harvestDate) } : {}) },
    }) });
  } catch {
    return Response.json({ error: "Could not update listing." }, { status: 503 });
  }
}