import { compare } from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const credentials = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(128) });

export async function POST(request: Request) {
  const parsed = credentials.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email and password." }, { status: 400 });
  if (!(await checkRateLimit(request, "login", 10, 60_000))) return Response.json({ error: "Too many sign-in attempts. Try again in a minute." }, { status: 429 });

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user?.isActive || !(await compare(parsed.data.password, user.passwordHash))) {
      return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, locale: user.locale } });
  } catch {
    return Response.json({ error: "Database unavailable. Configure PostgreSQL to sign in." }, { status: 503 });
  }
}