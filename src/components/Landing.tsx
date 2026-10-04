import Link from 'next/link'
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

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

const stats: [string, string][] = [
  ["1 min", "one-time setup"],
  ["0", "recharges missed"],
  ["Telegram", "+ push, not another app to check"],
];

export function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo href="/" />

        <Link
          href="/login"
          className="text-sm font-semibold text-ink border border-line rounded-lg px-4 py-2 hover:bg-paper-dim transition-colors cursor-pointer"
        >
          Log in
        </Link>
      </header>

      <main className="max-w-270 mx-auto px-6 pt-12 pb-20 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
        <div>
          <h1 className="font-display font-semibold text-ink text-[clamp(34px, 4.5vw, 52px)] leading-[1.08] tracking-tight max-w-lg">
            Nobody&apos;s phone should go dark because you forgot a recharge.
          </h1>
          <p className="text-ink-soft text-base leading-relaxed mt-5 max-w-md">
            Add your family&apos;s mobile and broadband plans once. Recharge Guard
            tracks every due date and pings you on Telegram or your browser a
            few days before anyone&apos;s line runs out.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-8">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-light transition-colors text-white font-semibold text-sm border-none rounded-lg px-6 py-3 cursor-pointer"
            >
              Get started <ArrowRight size={15} aria-hidden />
            </Link>
          </div>

          <div className="flex flex-wrap gap-7 mt-10">
            {stats.map(([n, l]) => (
              <div key={l}>
                <div className="font-mono text-xl font-semibold text-ink">{n}</div>
                <div className="text-xs text-ink-soft mt-1 max-w-36">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative h-85 flex items-center justify-center">
          {fanCards.map((c, i) => (
            <div
              key={c.label}
              className="absolute w-57.5 bg-white border border-line rounded-xl px-5 py-4 shadow-md"
              style={{ transform: `rotate(${c.rotate}deg) translateX(${i * 8}px)`, zIndex: i }}
            >
              <div className="font-display font-semibold text-ink text-base">
                {c.label}
              </div>
              <div className="flex items-end justify-between mt-4 pt-3 border-t border-dashed border-line">
                <div className="font-mono text-sm font-semibold text-ink">
                  ₹{c.amount}
                </div>
                <div className={`font-mono text-[11px] font-semibold rounded px-2 py-0.5 ${toneClasses[c.tone]}`}>
                  {c.days}
                  {/* {c.days < 0 ? `${Math.abs(c.days)}d late` : `${c.days}d left`} */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <section className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <Feature
            title="One place for the whole family"
            body="Papa's Jio, Maa's Airtel, the home fiber — every plan lives on one dashboard instead of scattered reminders in your head."
          />
          <Feature
            title="Reminded before it's due"
            body="Set how many days of lead time you want per plan. Recharge Guard checks every day and nudges you before anyone goes offline."
          />
          <Feature
            title="Telegram or push, your call"
            body="Turn on browser push for zero setup, or connect Telegram as a second channel that survives a cleared cache."
          />
        </div>
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="font-display font-semibold text-ink text-[15px]">{title}</div>
      <p className="text-sm text-ink-soft leading-relaxed mt-2">{body}</p>
    </div>
  );
}