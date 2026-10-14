import { z } from "zod";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const listingInput = z.object({
  crop: z.string().trim().min(2).max(80),
  variety: z.string().trim().max(80).optional(),
  grade: z.string().trim().max(80).nullable().optional(),
  quantity: z.number().positive().max(1_000_000),
  unit: z.enum(["kg", "crate", "tonne"]).default("kg"),
  pricePerKg: z.number().positive().max(10_000_000),
  location: z.string().trim().min(2).max(120),
  harvestDate: z.string().date().nullable().optional(),
  availableUntil: z.string().date().nullable().optional(),
  imageUrl: z.string().url().startsWith("https://").nullable().optional(),
}).refine((data) => !data.harvestDate || !data.availableUntil || data.harvestDate <= data.availableUntil, {
  message: "The availability date cannot be earlier than the harvest date.",
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const crop = url.searchParams.get("crop");
  const user = await getCurrentUser();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  try {
    const listings = await prisma.listing.findMany({
      where: {
        AND: [
          user?.role === "ADMIN" ? {} : {
            OR: [
              {
                status: "ACTIVE",
                OR: [{ availableUntil: null }, { availableUntil: { gte: today } }],
              },
              ...(user?.role === "FARMER" ? [{ farmerId: user.id }] : []),
            ],
          },
          ...(crop && crop !== "All crops" ? [{ crop }] : []),
          ...(search ? [{
            OR: [
              { crop: { contains: search, mode: "insensitive" as const } },
              { location: { contains: search, mode: "insensitive" as const } },
            ],
          }] : []),
        ],
      },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            village: true,
            verifications: {
              where: { status: "APPROVED" },
              select: { farmName: true, district: true },
              orderBy: { reviewedAt: "desc" },
              take: 1,
            },
            farmerReviews: {
              where: { status: "PUBLISHED" },
              select: { rating: true },
            },
            _count: {
              select: {
                farmerOrders: { where: { status: "COMPLETED" } },
              },
            },
          },
        },
      },
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
      data: {
        ...parsed.data,
        farmerId: user!.id,
        harvestDate: parsed.data.harvestDate ? new Date(parsed.data.harvestDate) : null,
        availableUntil: parsed.data.availableUntil ? new Date(parsed.data.availableUntil) : null,
      },
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
    grade: z.string().trim().max(80).nullable().optional(),
    quantity: z.number().positive().max(1_000_000).optional(),
    unit: z.enum(["kg", "crate", "tonne"]).optional(),
    pricePerKg: z.number().positive().max(10_000_000).optional(),
    location: z.string().trim().min(2).max(120).optional(),
    harvestDate: z.string().date().nullable().optional(),
    availableUntil: z.string().date().nullable().optional(),
    imageUrl: z.string().url().startsWith("https://").nullable().optional(),
  }).refine(({ status, ...details }) => status !== undefined || Object.values(details).some((value) => value !== undefined)).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid listing update." }, { status: 400 });
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data.id },
      select: { farmerId: true, harvestDate: true, availableUntil: true },
    });
    if (!listing) return Response.json({ error: "Listing not found." }, { status: 404 });
    if (user.role !== "ADMIN" && (user.role !== "FARMER" || listing.farmerId !== user.id)) return Response.json({ error: "You do not have permission to update this listing." }, { status: 403 });
    const effectiveHarvestDate = parsed.data.harvestDate === undefined
      ? listing.harvestDate
      : parsed.data.harvestDate ? new Date(parsed.data.harvestDate) : null;
    const effectiveAvailableUntil = parsed.data.availableUntil === undefined
      ? listing.availableUntil
      : parsed.data.availableUntil ? new Date(parsed.data.availableUntil) : null;
    if (effectiveHarvestDate && effectiveAvailableUntil && effectiveAvailableUntil < effectiveHarvestDate) {
      return Response.json({ error: "The availability date cannot be earlier than the harvest date." }, { status: 400 });
    }
    const { id, harvestDate, availableUntil, ...changes } = parsed.data;
    return Response.json({ listing: await prisma.listing.update({
      where: { id },
      data: {
        ...changes,
        ...(harvestDate !== undefined ? { harvestDate: harvestDate ? new Date(harvestDate) : null } : {}),
        ...(availableUntil !== undefined ? { availableUntil: availableUntil ? new Date(availableUntil) : null } : {}),
      },
    }) });
  } catch {
    return Response.json({ error: "Could not update listing." }, { status: 503 });
  }
}