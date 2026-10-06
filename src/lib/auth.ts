import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const cookieName = "smartagri_session";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32)) {
    throw new Error("AUTH_SECRET must contain at least 32 characters in production.");
  }
  return new TextEncoder().encode(value ?? "smartagri-local-development-secret-change-before-deploy");
}

export async function createSession(userId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());

  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  (await cookies()).delete(cookieName);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, locale: true, isActive: true },
    }).then((user) => user?.isActive ? user : null);
  } catch {
    return null;
  }
}

export async function requireRole(...roles: Array<"FARMER" | "BUYER" | "ADMIN">) {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: Response.json({ error: "Sign in required." }, { status: 401 }) };
  if (roles.length && !roles.includes(user.role)) {
    return { user: null, response: Response.json({ error: "You do not have permission for this action." }, { status: 403 }) };
  }
  return { user, response: null };
}