import Link from 'next/link'
import { ArrowRight, BellRing, Send, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { TrackedLink } from "@/components/TrackedLink";

const fanCards = [
  {
    label: "Papa",
    amount: 239,
    days: "2d left",
    // days: 2,
    tone: "amber" as const,
    rotate: -8
  },
  {
    label: "Wife",
    amount: 299,
    days: "11d left",
    // days: 11,
    tone: "teal" as const,
    rotate: 3
  },
  {
    label: "Home Fiber",
    amount: 799,
    days: "1d late",
    // days: -1,
    tone: "rose" as const,
    rotate: 12
  },
];

const toneClasses = {
  amber: "text-amber bg-amber-soft",
  teal: "text-teal bg-teal-soft",
  rose: "text-rose bg-rose-soft",
};

// Only claims that are literally true of the product (the default lead time
// is 3 days, there are two channels, setup is one form).
const facts: [string, string][] = [
  ["1 min", "to add your first plan"],
  ["3 days", "default heads-up, set per plan"],
  ["2 channels", "Telegram + browser push"],
];

const ctaClass =
  "inline-flex items-center justify-center gap-2 bg-brand-strong hover:brightness-110 transition text-white font-semibold text-sm rounded-lg px-6 py-3.5";

export function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <Logo href="/" />
        <TrackedLink
          href="/login"
          label="header_login"
          className="text-sm font-semibold text-ink border border-line rounded-lg px-4 py-2 hover:bg-paper-dim transition-colors"
        >
          Log in
        </TrackedLink>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-10 sm:pt-16 pb-16 sm:pb-24 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-8 items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft text-brand-strong text-xs font-semibold px-3 py-1.5">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            Recharge reminders for the whole family
          </p>

          <h1 className="mt-5 font-display font-semibold text-ink text-balance tracking-tight leading-[1.05] text-[clamp(2.25rem,5vw,3.25rem)]">
            {/* Nobody&apos;s phone should go dark because you forgot a recharge. */}
            Never let a family phone{" "}
            <span className="text-brand-strong">go dark</span> again.
          </h1>

          <p className="mt-5 max-w-lg text-base sm:text-lg leading-relaxed text-ink-soft">
            Add your family&apos;s mobile and broadband plans once. Recharge
            Guard tracks every due date and pings you on Telegram or your
            browser a few days before anyone&apos;s line runs out.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
            <TrackedLink href="/login" label="hero_get_started" className={ctaClass}>
              Get started <ArrowRight size={16} aria-hidden />
            </TrackedLink>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center text-sm font-semibold text-ink rounded-lg px-5 py-3.5 hover:bg-paper-dim transition-colors"
            >
              See how it works
            </Link>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-4 sm:gap-8 max-w-lg border-t border-line pt-6">
            {facts.map(([value, label]) => (
              <div key={label}>
                <dt className="font-mono text-lg sm:text-xl font-semibold text-ink">{value}</dt>
                <dd className="mt-1 text-xs text-ink-soft leading-snug">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Decorative preview of the dashboard cards */}
        <div
          aria-hidden="true"
          className="relative h-72 sm:h-85 flex items-center justify-center select-none"
        >
          {fanCards.map((c, i) => (
            <div
              key={c.label}
              className="absolute w-57.5 bg-white border border-line rounded-xl px-5 py-4 shadow-md"
              style={{
                transform: `rotate(${c.rotate}deg) translateX(${i * 8}px)`,
                zIndex: i,
              }}
            >
              <div className="font-display font-semibold text-ink text-base">
                {c.label}
              </div>
              <div className="flex items-end justify-between mt-4 pt-3 border-t border-dashed border-line">
                <div className="font-mono text-sm font-semibold text-ink">
                  ₹{c.amount}
                </div>
                <div className={`font-mono text-xs font-semibold rounded px-2 py-0.5 ${toneClasses[c.tone]}`}>
                  {c.days}
                  {/* {c.days < 0 ? `${Math.abs(c.days)}d late` : `${c.days}d left`} */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <section id="how-it-works" className="border-y border-line bg-white/60 scroll-mt-4">
        <div className="max-w-5xl mx-auto px-6 py-14 sm:py-16">
          <h2 className="font-display font-semibold text-ink text-2xl sm:text-3xl tracking-tight text-balance max-w-xl">
            One dashboard instead of reminders scattered in your head.
          </h2>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <Feature
              icon={<Users size={18} aria-hidden />}
              title="One place for the whole family"
              body="Papa's Jio, Maa's Airtel, the home fiber — every plan lives on one dashboard, each with its own due date."
            />
            <Feature
              icon={<BellRing size={18} aria-hidden />}
              title="Reminded before it's due"
              body="Choose how many days of lead time each plan gets. Recharge Guard checks daily and nudges you before anyone goes offline."
            />
            <Feature
              icon={<Send size={18} aria-hidden />}
              title="Telegram or push, your call"
              body="Turn on browser push for zero setup, or connect Telegram as a second channel that survives a cleared cache."
            />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-14 sm:py-16">
        <div className="rounded-2xl bg-ink px-6 py-10 sm:px-12 sm:py-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="font-display font-semibold text-white text-2xl sm:text-3xl tracking-tight text-balance">
              Add your first plan in a minute.
            </h2>
            <p className="mt-2 text-sm text-white/70">
              Set it up once and let the reminders come to you.
            </p>
          </div>
          <TrackedLink
            href="/login"
            label="footer_get_started"
            className="inline-flex shrink-0 items-center justify-center gap-2 bg-white text-ink hover:bg-paper-dim transition-colors font-semibold text-sm rounded-lg px-6 py-3.5"
          >
            Get started <ArrowRight size={16} aria-hidden />
          </TrackedLink>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-soft">
          <span>© {new Date().getFullYear()} Recharge Guard</span>
          <span>Built so nobody&apos;s line runs out unnoticed.</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-line p-5">
      <div className="size-9 rounded-lg bg-brand-soft text-brand-strong flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-4 font-display font-semibold text-ink text-base">{title}</h3>
      <p className="mt-2 text-sm text-ink-soft leading-relaxed">{body}</p>
    </div>
  );
}