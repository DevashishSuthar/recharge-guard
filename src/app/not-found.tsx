import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="max-w-sm text-center">
        <p className="font-mono text-sm font-semibold text-brand-strong">404</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-ink-soft">
          That page doesn&apos;t exist, or it moved.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-brand-strong px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
        >
          Back to Recharge Guard
        </Link>
      </div>
    </main>
  );
}
