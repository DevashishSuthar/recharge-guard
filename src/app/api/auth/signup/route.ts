import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSession } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analyticsServer";
import { getClientIp, parseBody } from "@/lib/http";
import { checkRateLimits } from "@/lib/rateLimit";

const schema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function POST(req: NextRequest) {
  try {
    const limited = await checkRateLimits([
      { key: `signup:ip:${getClientIp(req)}`, limit: 5, windowSeconds: 60 * 60 },
    ]);
    if (limited) {
      return limited;
    }

    const body = await parseBody(req, schema);
    if (!body.ok) {
      return body.response;
    }

    const { password } = body.data;
    const email = body.data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password) },
    });

    await createSession(user.id);
    trackServerEvent("signup", user.id);

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (err) {
    console.error("Error in signup route:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
