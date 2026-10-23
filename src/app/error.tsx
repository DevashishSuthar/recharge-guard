"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-2xl font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-soft">
          An unexpected error occurred. Your data is safe — try again, and if it keeps happening,
          reload the page.
        </p>
        <button
          onClick={() => retry()}
          className="mt-5 rounded-lg bg-brand-strong px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 cursor-pointer"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
