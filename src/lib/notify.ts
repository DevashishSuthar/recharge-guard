import webpush from "web-push";

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(
    // Push services use this to contact you if your sends misbehave.
    process.env.VAPID_SUBJECT || "mailto:you@example.com",
    vapidPublic,
    vapidPrivate
  );
}

export type PushPayload = {
  title: string;
  body: string; /** Path opened on click. */
  url?: string
};

export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not set, skipping Telegram send");
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      // One slow Telegram call must not eat the whole cron run.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("Telegram send failed", await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Telegram send errored", err);
    return false;
  }
}

export async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { timeout: 8000 }
    );
  } catch (err: unknown) {
    // A 410/404 means the browser unsubscribed or cleared storage — the
    // caller should delete this row rather than retry it forever.
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      throw new StaleSubscriptionError(sub.endpoint);
    }
    throw err;
  }
}

export class StaleSubscriptionError extends Error {
  constructor(public endpoint: string) {
    super(`Push subscription is stale: ${endpoint}`);
  }
}
