import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { trackServerEvent } from "@/lib/analyticsServer";
import { badRequest, parseBody, unauthorized } from "@/lib/http";
import { createReminderSchema, LEAD_TOO_LONG_MESSAGE } from "@/lib/schemas";
import { serializeReminder } from "@/lib/serializers";
import { DEFAULT_LEAD_DAYS, MAX_REMINDERS_PER_USER } from "@/lib/constants";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorized();
  }

  const items = await prisma.reminder.findMany({
    where: { userId },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    take: MAX_REMINDERS_PER_USER,
  });

  return NextResponse.json(items.map(serializeReminder));
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorized();
  }

  const body = await parseBody(req, createReminderSchema);
  if (!body.ok) {
    return body.response;
  }
  const data = body.data;

  const [count, user] = await Promise.all([
    prisma.reminder.count({ where: { userId } }),
    data.leadDays === undefined
      ? prisma.user.findUnique({ where: { id: userId }, select: { defaultLeadDays: true } })
      : null,
  ]);
  if (count >= MAX_REMINDERS_PER_USER) {
    return badRequest(`You can keep up to ${MAX_REMINDERS_PER_USER} reminders — delete a few first`);
  }

  const leadDays = data.leadDays ?? user?.defaultLeadDays ?? DEFAULT_LEAD_DAYS;
  const repeatDays = data.repeatDays ?? null;
  if (repeatDays !== null && leadDays >= repeatDays) return badRequest(LEAD_TOO_LONG_MESSAGE);

  const item = await prisma.reminder.create({
    data: {
      userId,
      title: data.title,
      note: data.note || null,
      dueDate: data.dueDate,
      repeatDays,
      leadDays,
    },
  });

  trackServerEvent("reminder_created", userId);

  return NextResponse.json(serializeReminder(item), { status: 201 });
}
