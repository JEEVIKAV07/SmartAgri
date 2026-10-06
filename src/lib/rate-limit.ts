import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function checkRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const id = createHash("sha256").update(`${scope}:${address}`).digest("hex");
  const now = new Date();
  const windowEndsAt = new Date(now.getTime() + windowMs);

  await prisma.rateLimitBucket.upsert({
    where: { id },
    create: { id, count: 0, windowEndsAt },
    update: {},
  });
  await prisma.rateLimitBucket.updateMany({
    where: { id, windowEndsAt: { lte: now } },
    data: { count: 0, windowEndsAt },
  });
  const updated = await prisma.rateLimitBucket.updateMany({
    where: { id, windowEndsAt: { gt: now }, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  return updated.count === 1;
}