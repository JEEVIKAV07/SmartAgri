import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const signupDetails = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(["BUYER", "FARMER"]),
});

export async function POST(request: Request) {
  const parsed = signupDetails.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Enter a name, valid email, password of at least 8 characters, and account type." }, { status: 400 });
  }

  try {
    if (!(await checkRateLimit(request, "signup", 5, 60_000))) {
      return Response.json({ error: "Too many sign-up attempts. Try again in a minute." }, { status: 429 });
    }

    const email = parsed.data.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) return Response.json({ error: "An account with this email already exists." }, { status: 409 });

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash: await hash(parsed.data.password, 12),
        role: parsed.data.role,
      },
      select: { id: true, name: true, email: true, role: true, locale: true },
    });
    await createSession(user.id);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    return Response.json({ error: "Database unavailable. Configure PostgreSQL to create an account." }, { status: 503 });
  }
}
