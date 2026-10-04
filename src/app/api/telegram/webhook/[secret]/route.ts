import { z } from "zod";
import { sendTelegramMessage } from "@/lib/notify";

const updateSchema = z.object({
  message: z.object({
    chat: z.object({ id: z.union([z.number().int(), z.string()]) }),
    text: z.string().optional(),
  }).optional(),
});

type Params = { params: Promise<{ secret: string }> };

export async function POST(req: Request, { params }: Params) {
  const { secret } = await params;
  const expectedPathSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const expectedHeaderSecret = process.env.TELEGRAM_WEBHOOK_HEADER_SECRET;

  if (
    !expectedPathSecret ||
    !expectedHeaderSecret ||
    secret !== expectedPathSecret ||
    req.headers.get("x-telegram-bot-api-secret-token") !== expectedHeaderSecret
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return Response.json({ error: "Telegram is not configured" }, { status: 503 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid Telegram update" }, { status: 400 });
  }

  const message = parsed.data.message;
  if (!message) {
    // Non-message updates (edited_message, channel_post, callback_query, ...)
    // — nothing for this bot to do with them.
    return Response.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const command = message.text?.trim().split(/\s+/, 1)[0];
  const isStart = command !== undefined && /^\/start(?:@[^\s]+)?$/.test(command);

  // The bot's only job is handing back the chat ID, so it replies with that
  // to /start *and* to anything else the user sends (plain text, a sticker
  // with no text, a random command) — never leaving the user without a
  // response after they've messaged the bot expecting to be told what to do.
  const text = isStart
    ? `Welcome to Recharge Guard! Your Telegram chat ID is: ${chatId}\n\nPaste this into Settings → Telegram chat ID to start getting recharge reminders here.`
    : `Your Recharge Guard chat ID is: ${chatId}\n\nPaste this into Settings → Telegram chat ID to start getting recharge reminders here. (Send /start any time to see this again.)`;

  const sent = await sendTelegramMessage(chatId, text);
  return sent
    ? Response.json({ ok: true })
    : Response.json({ error: "Telegram message could not be sent" }, { status: 502 });
}