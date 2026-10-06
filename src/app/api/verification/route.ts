import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const { user, response } = await requireRole("ADMIN");
  if (response) return response;
  try {
    const submissions = await prisma.verificationSubmission.findMany({ include: { farmer: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "asc" } });
    return Response.json({ submissions });
  } catch {
    return Response.json({ error: "Database unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireRole("FARMER");
  if (response) return response;
  if (!(await checkRateLimit(request, "verification", 5, 60 * 60_000))) return Response.json({ error: "Too many verification submissions. Try again later." }, { status: 429 });
  const parsed = z.object({ farmName: z.string().trim().min(2).max(120), district: z.string().trim().min(2).max(120), documentRef: z.string().trim().min(1).max(240) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Complete all verification fields." }, { status: 400 });
  try {
    const submission = await prisma.verificationSubmission.create({ data: { ...parsed.data, farmerId: user!.id } });
    return Response.json({ submission }, { status: 201 });
  } catch {
    return Response.json({ error: "Could not submit verification." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const { user, response } = await requireRole("ADMIN");
  if (response) return response;
  const parsed = z.object({ id: z.string().min(1), decision: z.enum(["APPROVED", "REJECTED"]), note: z.string().trim().max(500).optional() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid verification decision." }, { status: 400 });
  try {
    const submission = await prisma.verificationSubmission.update({ where: { id: parsed.data.id }, data: { status: parsed.data.decision, reviewerId: user!.id, decisionNote: parsed.data.note, reviewedAt: new Date() } });
    return Response.json({ submission });
  } catch {
    return Response.json({ error: "Could not update verification." }, { status: 503 });
  }
}