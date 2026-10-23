import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword, createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trackServerEvent } from "@/lib/analyticsServer";
import { getClientIp, parseBody } from "@/lib/http";
import { checkRateLimits } from "@/lib/rateLimit";

const schema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const INVALID = { error: "Invalid email or password" };
const FIFTEEN_MIN = 15 * 60;

export async function POST(req: NextRequest) {
  try {
    // Throttle by IP first so a flood never reaches bcrypt or the database.
    const ipLimited = await checkRateLimits([
      { key: `login:ip:${getClientIp(req)}`, limit: 20, windowSeconds: FIFTEEN_MIN },
    ]);
    if (ipLimited) {
      return ipLimited;
    }

    const body = await parseBody(req, schema);
    if (!body.ok) {
      return NextResponse.json(INVALID, { status: 400 });
    }

    const { password } = body.data;
    const email = body.data.email.toLowerCase().trim();

    // Per-account limit stops a slow password-guessing run spread across many IPs.
    const accountLimited = await checkRateLimits([
      { key: `login:email:${email}`, limit: 10, windowSeconds: FIFTEEN_MIN },
    ]);
    if (accountLimited) {
      return accountLimited;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(INVALID, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(INVALID, { status: 401 });
    }

    await createSession(user.id);
    trackServerEvent("login", user.id);

    return NextResponse.json({ id: user.id, email: user.email }, { status: 200 });
  } catch (err) {
    console.error("Error in login route:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}