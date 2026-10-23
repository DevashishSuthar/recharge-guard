"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Field from "@/components/Field";
import { Logo } from "@/components/Logo";
import { trackGA } from "@/lib/analytics";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      const isSignup = mode === "signup";
      trackGA(isSignup ? "sign_up" : "login", { method: "email" });
      router.push(isSignup ? "/notifications" : "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-7">
          <Logo href="/" textClassName="text-2xl" />
        </div>

        <div className="bg-white border border-line rounded-xl p-7 shadow-sm">
          <div className="flex gap-1 bg-paper-dim rounded-lg p-1 mb-6">
            {(["signup", "login"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-md border-none cursor-pointer text-sm font-semibold transition ${mode === m
                    ? "bg-white text-ink shadow-sm"
                    : "text-ink-soft"
                  }`}
              >
                {m === "signup" ? "Sign up" : "Log in"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-line rounded-lg px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-line rounded-lg pl-3 pr-10 py-2.5 text-sm text-ink outline-none focus:border-brand"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-soft hover:text-ink"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="text-sm text-rose bg-rose-soft rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              //  style={{
              //   width: "100%", marginTop: 8, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600,
              //   color: "#fff", background: COLORS.ink, border: "none", borderRadius: 8, padding: "12px 0", cursor: "pointer"
              // }}
              className="w-full mt-2 bg-brand-strong hover:brightness-110 transition text-white font-semibold text-sm border-none rounded-lg py-3 disabled:opacity-60 cursor-pointer"
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c7 0 10.5 7 10.5 7a13.4 13.4 0 0 1-3.15 4.03M6.6 6.6C3.4 8.4 1.5 12 1.5 12s3.5 7 10.5 7a10.6 10.6 0 0 0 4.4-.94" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}