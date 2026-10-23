import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { badRequest, isRecordNotFound, notFound, parseBody, unauthorized } from "@/lib/http";
import { LEAD_TOO_LONG_MESSAGE, patchReminderSchema } from "@/lib/schemas";
import { serializeReminder } from "@/lib/serializers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorized();
  }

  const { id } = await params;
  const body = await parseBody(req, patchReminderSchema);
  if (!body.ok) {
    return body.response;
  }
  const data = body.data;

  const existing = await prisma.reminder.findFirst({ where: { id, userId } });
  if (!existing) {
    return notFound();
  }
  if (existing.completedAt) {
    return badRequest("Completed reminders can't be edited");
  }

  const leadDays = data.leadDays ?? existing.leadDays;
  const repeatDays = data.repeatDays === undefined ? existing.repeatDays : data.repeatDays;
  if (repeatDays !== null && leadDays >= repeatDays) {
    return badRequest(LEAD_TOO_LONG_MESSAGE);
  }

  try {
    const updated = await prisma.reminder.update({
      where: { id, userId },
      data: {
        ...data,
        ...(data.note === undefined ? {} : { note: data.note || null }),
      },
    });
    return NextResponse.json(serializeReminder(updated));
  } catch (err) {
    if (isRecordNotFound(err)) {
      return notFound();
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return unauthorized();
  }

  const { id } = await params;
  const { count } = await prisma.reminder.deleteMany({ where: { id, userId } });
  if (count === 0) {
    return notFound();
  }

  return NextResponse.json({ ok: true });
}
