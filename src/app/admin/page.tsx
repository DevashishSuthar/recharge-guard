import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

const RANGES = [7, 30, 90] as const;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

type DailyRow = { day: string; views: number; visitors: number };
type Count = { label: string; count: number };

function istDayKey(d: Date) {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function rangeStart(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

/** One entry per IST calendar day (oldest first), zero-filled where there was no traffic. */
function fillDays(days: number, rows: DailyRow[]): DailyRow[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: DailyRow[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = istDayKey(new Date(Date.now() - i * 86_400_000));
    out.push(byDay.get(key) ?? { day: key, views: 0, visitors: 0 });
  }
  return out;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  // Only emails listed in ADMIN_EMAILS may see this page; everyone else gets a 404.
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!me || !admins.includes(me.email.toLowerCase())) notFound();

  const { days: daysParam } = await searchParams;
  const days = RANGES.find((r) => String(r) === daysParam) ?? 30;
  const since = rangeStart(days);

  const [
    dailyRaw,
    totals,
    activeUsersRaw,
    topPages,
    topReferrers,
    countries,
    devices,
    utmSources,
    ctaClicks,
    productEvents,
    landingVisitors,
    loginVisitors,
    newUsers,
    totalUsers,
    totalRecharges,
    activatedRaw,
  ] = await Promise.all([
    prisma.$queryRaw<DailyRow[]>`
      SELECT to_char((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS views,
             COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "analytics_events"
      WHERE "name" = 'page_view' AND "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ views: number; visitors: number }[]>`
      SELECT COUNT(*)::int AS views, COUNT(DISTINCT "visitorId")::int AS visitors
      FROM "analytics_events" WHERE "name" = 'page_view' AND "createdAt" >= ${since}`,
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(DISTINCT "userId")::int AS n
      FROM "analytics_events" WHERE "userId" IS NOT NULL AND "createdAt" >= ${since}`,
    group("path", { name: "page_view" }, since),
    group("referrer", { name: "page_view" }, since),
    group("country", { name: "page_view" }, since),
    group("device", { name: "page_view" }, since),
    group("utmSource", { name: "page_view" }, since),
    group("label", { name: "cta_click" }, since),
    prisma.analyticsEvent
      .groupBy({
        by: ["name"],
        where: { createdAt: { gte: since }, name: { notIn: ["page_view", "cta_click"] } },
        _count: { _all: true },
        orderBy: { _count: { name: "desc" } },
      })
      .then((rows) => rows.map((r) => ({ label: r.name, count: r._count._all }))),
    distinctVisitors("/", since),
    distinctVisitors("/login", since),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count(),
    prisma.rechargeItem.count(),
    prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(DISTINCT "userId")::int AS n
      FROM "analytics_events" WHERE "name" = 'recharge_created' AND "createdAt" >= ${since}`,
  ]);

  const series = fillDays(days, dailyRaw);
  const maxVisitors = Math.max(1, ...series.map((s) => s.visitors));

  const funnel: Count[] = [
    { label: "Visited landing page", count: landingVisitors },
    { label: "Opened login / signup", count: loginVisitors },
    { label: "Created an account", count: newUsers },
    { label: "Added a first recharge", count: activatedRaw[0]?.n ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo href="/dashboard" textClassName="text-base" />
          <Link href="/dashboard" className="text-sm font-semibold text-ink-soft hover:text-ink">
            ← Back to app
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Analytics</h1>
            <p className="text-sm text-ink-soft mt-1">
              First-party, cookieless. Days are IST. Last {days} days.
            </p>
          </div>
          <div className="flex gap-1 rounded-lg bg-paper-dim p-1 text-sm font-semibold">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/admin?days=${r}`}
                className={`rounded-md px-3 py-1.5 ${r === days ? "bg-white text-ink shadow-sm" : "text-ink-soft"}`}
              >
                {r}d
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Visitors" value={totals[0]?.visitors ?? 0} hint="unique per day, summed" />
          <Stat label="Page views" value={totals[0]?.views ?? 0} />
          <Stat label="Active users" value={activeUsersRaw[0]?.n ?? 0} hint="signed-in, in range" />
          <Stat label="New sign-ups" value={newUsers} hint={`${totalUsers} total users`} />
        </div>

        <Card title="Visitors per day" className="mt-4">
          <div className="flex items-end gap-px h-36" role="img" aria-label="Daily unique visitors">
            {series.map((s) => (
              <div
                key={s.day}
                title={`${s.day}: ${s.visitors} visitors, ${s.views} views`}
                className="flex-1 min-w-px rounded-t bg-brand"
                style={{ height: `${Math.max(2, (s.visitors / maxVisitors) * 100)}%`, opacity: s.visitors ? 1 : 0.25 }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-ink-soft font-mono">
            <span>{series[0]?.day}</span>
            <span>{series[series.length - 1]?.day}</span>
          </div>
        </Card>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Funnel (visitors → users)">
            <List rows={funnel} base={funnel[0].count} />
          </Card>
          <Card title="Product events">
            <List rows={productEvents} empty="No product events yet." />
            <p className="mt-3 text-xs text-ink-soft">
              {totalRecharges} recharges tracked in total.
            </p>
          </Card>
          <Card title="Top pages"><List rows={topPages} /></Card>
          <Card title="Top referrers"><List rows={topReferrers} empty="No external referrers yet." /></Card>
          <Card title="Campaigns (utm_source)"><List rows={utmSources} empty="No UTM-tagged visits." /></Card>
          <Card title="CTA clicks"><List rows={ctaClicks} empty="No clicks yet." /></Card>
          <Card title="Countries"><List rows={countries} empty="Country is only available on Vercel." /></Card>
          <Card title="Devices"><List rows={devices} /></Card>
        </div>
      </main>
    </div>
  );
}

async function group(
  field: "path" | "referrer" | "country" | "device" | "utmSource" | "label",
  where: { name: string },
  since: Date
): Promise<Count[]> {
  const rows = await prisma.analyticsEvent.groupBy({
    by: [field],
    where: { ...where, createdAt: { gte: since }, [field]: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { [field]: "desc" } },
    take: 8,
  });
  return rows.map((r) => ({ label: String(r[field]), count: r._count._all }));
}

async function distinctVisitors(path: string, since: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(DISTINCT "visitorId")::int AS n
    FROM "analytics_events"
    WHERE "name" = 'page_view' AND "path" = ${path} AND "createdAt" >= ${since}`;
  return rows[0]?.n ?? 0;
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="text-xs font-semibold text-ink-soft">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold text-ink">{value.toLocaleString("en-IN")}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-soft">{hint}</div>}
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-line bg-white p-5 ${className}`}>
      <h2 className="text-sm font-semibold text-ink mb-3">{title}</h2>
      {children}
    </section>
  );
}

function List({ rows, base, empty = "No data yet." }: { rows: Count[]; base?: number; empty?: string }) {
  if (rows.length === 0) return <p className="text-sm text-ink-soft">{empty}</p>;
  const max = base ?? Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between gap-3">
            <span className="truncate text-ink">{r.label}</span>
            <span className="font-mono text-ink-soft shrink-0">
              {r.count.toLocaleString("en-IN")}
              {base ? ` · ${Math.round((r.count / Math.max(1, base)) * 100)}%` : ""}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-paper-dim">
            <div className="h-full rounded-full bg-teal" style={{ width: `${Math.min(100, (r.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
