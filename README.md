# Recharge Guard

Recharge reminders for your family — mobile + broadband, one setup, notified before the due date.

## Features
- **Recharges** — mobile, broadband or other plans with a billing cycle; reminded N days before each due date, one tap to roll the cycle forward.
- **Reminders** — simple day-based notes for anything that isn't a recharge ("renew car insurance", "change AC filter"): a title, an optional note, a due date and an optional repeat interval.
- **Channels** — browser push and/or Telegram. One daily cron checks both recharges and reminders.
- **Analytics** — Google Analytics (with a consent banner) plus a first-party, cookieless dashboard at `/admin`.

## Stack
Next.js App Router (API routes only, no separate backend), Prisma 7, Postgres (Neon recommended), custom JWT auth (jose + bcryptjs), Serwist for PWA/service worker, web-push for browser notifications, Telegram Bot API as the optional second channel.

## 1. Local setup

```bash
pnpm install
```

`pnpm install` will try to run `prisma generate` automatically (see `postinstall` in package.json). If that fails here for any reason, run it manually — it needs real internet access to fetch Prisma's query engine binaries:

```bash
pnpm prisma generate
```

Copy the env template and fill in real values:

```bash
cp .env.example .env
```

## 2. Environment variables

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Create a free project at neon.tech, copy the pooled connection string |
| `AUTH_SECRET` | **Required in production, at least 32 characters** — the app refuses to start without it. `openssl rand -base64 32` |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Run `npx web-push generate-vapid-keys` |
| `TELEGRAM_BOT_TOKEN` | Message @BotFather on Telegram, `/newbot`, copy the token |
| `TELEGRAM_WEBHOOK_SECRET` | A long random value used as the webhook URL segment |
| `TELEGRAM_WEBHOOK_HEADER_SECRET` | A random value sent by Telegram as its webhook secret header |
| `CRON_SECRET` | **Required.** Any random string (`openssl rand -hex 32`) — the cron route returns 401 for everyone if it is unset |
| `VAPID_SUBJECT` | Optional. `mailto:you@yourdomain.com` — contact address sent to push services |
| `PUBLIC_APP_URL` | Your deployed URL, used for page metadata |
| `NEXT_PUBLIC_GA_ID` | Optional. Google Analytics 4 measurement ID (`G-XXXXXXXXXX`). Inlined at build time — redeploy after changing |
| `ADMIN_EMAILS` | Comma-separated emails allowed to open `/admin` |
| `ANALYTICS_SALT` | Optional. Secret for hashing anonymous visitor ids (falls back to `AUTH_SECRET`) |

## 3. Database

```bash
pnpm prisma migrate deploy
```

This applies everything in `prisma/migrations/`: the base tables (`User`, `RechargeItem`, `PushSubscription`) plus `analytics_events`, `reminders` and `rate_limits`.

> The checked-in migrations don't include the very first "create tables" migration. On a **fresh** database run `pnpm prisma db push` instead (or generate an initial migration first). On the database you already use, `migrate deploy` is all you need.

Recharge amounts are entered in rupees and stored as integer paise, so values such as `239.50` are represented without floating-point currency errors. Existing databases must apply the checked-in amount conversion migration before using the new API.

## 4. Run it

```bash
pnpm dev
```

Visit `http://localhost:3000` — you'll see the landing page; sign up and you land on the dashboard. (Signed-in visitors are redirected from `/` to `/dashboard` by `src/proxy.ts`.)

Note: the service worker (`disable: process.env.NODE_ENV === "development"` in `next.config.ts`) is turned off in dev to avoid stale-cache headaches. Push notifications only work in a production build:

```bash
pnpm build && pnpm start
```

## 5. Configure Telegram receiving

After deploying to an HTTPS URL, configure the bot webhook. Replace the placeholders with the same values used in the environment variables:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
	--data-urlencode "url=https://your-app.example.com/api/telegram/webhook/$TELEGRAM_WEBHOOK_SECRET" \
	--data-urlencode "secret_token=$TELEGRAM_WEBHOOK_HEADER_SECRET"
```

Users message the bot with `/start`; it replies with the chat ID. They then paste that ID into Settings. The webhook never associates an arbitrary Telegram chat with an account automatically.

## 6. Deploy to Vercel

1. Push to GitHub, import into Vercel.
2. Add all the env vars above in the Vercel project settings.
3. Deploy. `vercel.json` already configures the daily cron at **5:00 PM IST** (`30 11 * * *` — Vercel cron runs in UTC, and 11:30 UTC is 17:00 IST) — Vercel adds the `Authorization: Bearer $CRON_SECRET` header automatically when it calls your cron route, matching what `check-reminders/route.ts` expects.
4. **Hobby plan note:** Vercel Cron on the free tier only supports daily granularity, which is exactly what this needs. If you upgrade later you can run it more often.

## Notification flow

- Browser push: the production service worker is registered in the app, the browser requests permission, the VAPID subscription is saved to `PushSubscription`, and the daily cron sends to every registered device. Stale 404/410 subscriptions are deleted.
- Telegram: the protected webhook replies to `/start`, the user saves the returned chat ID through authenticated `/api/me`, and the daily cron sends Telegram reminders independently of browser push.
- Icons in `public/icons/` are placeholders generated for this scaffold — swap in real artwork before you'd want to actually install this as a home-screen app.
- Reminders (the note-style ones) use the same flow as recharges. A repeating reminder rolls its due date forward when you tap Done; a one-time reminder moves to "Completed".
- A notification is only marked as sent after at least one channel really delivered it. If every channel fails, the cron tries again the next day.

## Operational notes
- Login and signup are rate limited (Postgres-backed counters in `rate_limits`): 20 login attempts per IP and 10 per email per 15 minutes, 5 signups per IP per hour.
- All "which day is it" maths is done in IST (`Asia/Kolkata`), independent of the server's timezone.
- Option lists (recharge types, cycles, repeat intervals, lead days) live in `src/lib/constants.ts` — change them there and every dropdown and validator follows. Adding a recharge *type* also needs the Prisma `RechargeType` enum and a migration.
- API responses are never cached by the service worker.
