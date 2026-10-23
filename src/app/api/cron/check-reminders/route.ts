import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeDue, computeReminderDue, formatDueDate, formatRupees } from "@/lib/utils";
import {
  sendPushToSubscription,
  sendTelegramMessage,
  StaleSubscriptionError,
  type PushPayload,
} from "@/lib/notify";

// Delivery to many users can take a while; 60s is the max on Vercel Hobby.
export const maxDuration = 60;

const BATCH_SIZE = 10;

type Recipient = Prisma.UserGetPayload<{ include: { pushSubscriptions: true } }>;

/** One pending notification (a recharge or a reminder) for one user. */
type Notice = {
  user: Recipient;
  push: PushPayload;
  telegramText: string;
  /** Called after at least one channel delivered, to mark this due date as notified. */
  markNotified: () => Promise<unknown>;
};

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // A missing secret used to turn the check into `Bearer undefined`, which anyone could send.
  if (!secret || secret === "change-me") {
    console.error("CRON_SECRET is not configured — refusing to run the cron job");
    return false;
  }
  const given = req.headers.get("authorization") ?? "";
  const hash = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(hash(given), hash(`Bearer ${secret}`));
}

/**
 * Cheap SQL pre-filter: only rows whose reminder window could have started
 * (with one day of slack either side — the exact IST check happens in JS).
 * Without this the job loaded every row of every user on every run.
 */
async function candidateRechargeIds(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "recharge_items"
    WHERE ("lastRecharge" + (("cycleDays" - "leadDays" - 1) * interval '1 day')) <= (now() AT TIME ZONE 'UTC')
      AND "lastNotifiedFor" IS DISTINCT FROM ("lastRecharge" + ("cycleDays" * interval '1 day'))`;
  return rows.map((r) => r.id);
}

async function candidateReminderIds(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "reminders"
    WHERE "completedAt" IS NULL
      AND ("dueDate" - (("leadDays" + 1) * interval '1 day')) <= (now() AT TIME ZONE 'UTC')
      AND "lastNotifiedFor" IS DISTINCT FROM "dueDate"`;
  return rows.map((r) => r.id);
}

async function buildRechargeNotices(ids: string[]): Promise<Notice[]> {
  if (ids.length === 0) return [];
  const items = await prisma.rechargeItem.findMany({
    where: { id: { in: ids } },
    include: { user: { include: { pushSubscriptions: true } } },
  });

  const notices: Notice[] = [];
  for (const item of items) {
    const { due, status } = computeDue(item);
    if (status === "ok") continue;
    if (item.lastNotifiedFor?.getTime() === due.getTime()) continue;

    const dueLabel = formatDueDate(due);
    const message =
      status === "overdue"
        ? `⚠️ ${item.label}'s ${item.provider} recharge was due ${dueLabel} — it's overdue.`
        : `⏰ ${item.label}'s ${item.provider} recharge (₹${formatRupees(item.amount)}) is due ${dueLabel}.`;

    notices.push({
      user: item.user,
      push: { title: "Recharge Guard", body: message, url: "/dashboard" },
      telegramText: message,
      markNotified: () =>
        prisma.rechargeItem.update({ where: { id: item.id }, data: { lastNotifiedFor: due } }),
    });
  }
  return notices;
}

async function buildReminderNotices(ids: string[]): Promise<Notice[]> {
  if (ids.length === 0) return [];
  const items = await prisma.reminder.findMany({
    where: { id: { in: ids }, completedAt: null },
    include: { user: { include: { pushSubscriptions: true } } },
  });

  const notices: Notice[] = [];
  for (const item of items) {
    const { status } = computeReminderDue(item);
    if (status === "ok") continue;
    if (item.lastNotifiedFor?.getTime() === item.dueDate.getTime()) continue;

    const dueLabel = formatDueDate(item.dueDate);
    const headline =
      status === "overdue"
        ? `⚠️ Reminder: ${item.title} was due ${dueLabel} — it's overdue.`
        : `⏰ Reminder: ${item.title} is due ${dueLabel}.`;

    notices.push({
      user: item.user,
      push: { title: "Recharge Guard", body: headline, url: "/dashboard" },
      // The note only goes to Telegram, where there is room for it.
      telegramText: item.note ? `${headline}\n\n${item.note}` : headline,
      markNotified: () =>
        prisma.reminder.update({ where: { id: item.id }, data: { lastNotifiedFor: item.dueDate } }),
    });
  }
  return notices;
}

/** Tries every channel the user has. Returns true if at least one delivered. */
async function deliver(notice: Notice): Promise<boolean> {
  const { user } = notice;
  let delivered = false;

  const pushResults = await Promise.allSettled(
    user.pushSubscriptions.map((sub) => sendPushToSubscription(sub, notice.push))
  );
  for (const result of pushResults) {
    if (result.status === "fulfilled") {
      delivered = true;
    } else if (result.reason instanceof StaleSubscriptionError) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: result.reason.endpoint } });
    } else {
      console.error(`Push failed for user ${user.id}`, result.reason);
    }
  }

  if (user.telegramChatId && (await sendTelegramMessage(user.telegramChatId, notice.telegramText))) {
    delivered = true;
  }

  return delivered;
}

/**
 * Runs once a day at 5:00 PM IST (11:30 UTC — see vercel.json). Notifies, on
 * every channel the user has set up, for each recharge and each reminder that
 * is inside its lead window or overdue.
 *
 * `lastNotifiedFor` keeps this idempotent — and it is only written when a
 * message actually went out. Previously it was written even if every channel
 * failed, so a failed reminder was silently lost; now it is retried tomorrow.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rechargeIds, reminderIds] = await Promise.all([
    candidateRechargeIds(),
    candidateReminderIds(),
  ]);
  const notices = [
    ...(await buildRechargeNotices(rechargeIds)),
    ...(await buildReminderNotices(reminderIds)),
  ];

  let notified = 0;
  let failed = 0;
  let noChannel = 0;

  // Small parallel batches: fast, but never hundreds of simultaneous outbound calls.
  for (let i = 0; i < notices.length; i += BATCH_SIZE) {
    await Promise.all(
      notices.slice(i, i + BATCH_SIZE).map(async (notice) => {
        try {
          const hasChannel = notice.user.pushSubscriptions.length > 0 || notice.user.telegramChatId;
          if (!hasChannel) {
            noChannel++;
            return;
          }
          if (await deliver(notice)) {
            await notice.markNotified();
            notified++;
          } else {
            failed++;
          }
        } catch (err) {
          failed++;
          console.error(`Notification failed for user ${notice.user.id}`, err);
        }
      })
    );
  }

  // Housekeeping: drop expired rate-limit counters.
  await prisma.$executeRaw`
    DELETE FROM "rate_limits" WHERE "resetAt" < ((now() AT TIME ZONE 'UTC') - interval '1 day')`;

  return NextResponse.json({
    candidates: rechargeIds.length + reminderIds.length,
    due: notices.length,
    notified,
    failed,
    noChannel,
  });
}
