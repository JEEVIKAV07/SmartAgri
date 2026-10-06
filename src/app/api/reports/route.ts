import { z } from "zod";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reportReasons = ["FAKE_PRODUCT", "INCORRECT_INFORMATION", "MISLEADING_IMAGE", "POOR_QUALITY", "SUSPICIOUS_FARMER", "PAYMENT_ISSUE", "OTHER"] as const;

export async function GET() {
  const { response } = await requireRole("ADMIN");
  if (response) return response;
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { name: true } },
        reportedFarmer: { select: { name: true } },
        listing: { select: { crop: true, location: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({ reports });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireRole("BUYER");
  if (response) return response;
  const parsed = z.object({
    listingId: z.string().min(1),
    reason: z.enum(reportReasons),
    details: z.string().trim().max(1200).optional(),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose a reason and try again." }, { status: 400 });
  try {
    const listing = await prisma.listing.findUnique({ where: { id: parsed.data.listingId }, select: { farmerId: true } });
    if (!listing) return Response.json({ error: "Product not found." }, { status: 404 });
    const report = await prisma.report.create({
      data: { ...parsed.data, reporterId: user!.id, reportedFarmerId: listing.farmerId },
    });
    return Response.json({ report }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not submit report." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return Response.json({ error: "Administrator access required." }, { status: user ? 403 : 401 });
  const parsed = z.object({ id: z.string().min(1), status: z.enum(["REVIEWING", "RESOLVED", "DISMISSED"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid report action." }, { status: 400 });
  try {
    const report = await prisma.report.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
    return Response.json({ report });
  } catch {
    return Response.json({ error: "Could not update report." }, { status: 404 });
  }
}