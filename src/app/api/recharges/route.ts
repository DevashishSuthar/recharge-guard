import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { computeDue } from "@/lib/utils";
import { paiseToRupees, rupeesToPaise } from "@/lib/utils";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.rechargeItem.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  // Attach computed due/status so the client never has to duplicate this math.
  const withStatus = items.map((item) => ({
    ...item,
    amount: paiseToRupees(item.amount),
    ...computeDue(item),
  })); 

  return NextResponse.json(withStatus);
}

const createSchema = z.object({
  label: z.string().min(1).max(60),
  provider: z.string().min(1).max(40),
  type: z.enum(["MOBILE", "BROADBAND", "OTHER"]).default("MOBILE"),
  phone: z.string().max(20).optional(),
  amount: z.number().positive(),
  cycleDays: z.number().int().positive(),
  lastRecharge: z.coerce.date(),
  leadDays: z.number().int().min(0).max(30).default(3),
});

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  let amountInPaise: number;
  try {
    amountInPaise = rupeesToPaise(parsed.data.amount);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const item = await prisma.rechargeItem.create({
    data: { ...parsed.data, amount: amountInPaise, userId },
  });

  return NextResponse.json({ ...item, amount: paiseToRupees(item.amount) }, { status: 201 });
}
