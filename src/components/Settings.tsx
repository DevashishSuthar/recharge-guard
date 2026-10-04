"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2, Send, LogOut } from "lucide-react";
import { SettingsSkeleton } from "@/components/PageSkeletons";
import { enablePushNotifications } from "@/lib/pushClient";
import { useToast } from "@/components/Toast";

type Me = {
  email: string;
  telegramChatId: string | null;
  defaultLeadDays: number;
  pushDeviceCount: number;
};

type SaveState = "idle" | "saving" | "saved";

export function Settings() {
  const router = useRouter();
  const { showToast } = useToast();
  const [me, setMe] = useState<Me | null>(null);
  const [telegramInput, setTelegramInput] = useState("");
  const [telegramSave, setTelegramSave] = useState<SaveState>("idle");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data: Me) => {
        setMe(data);
        setTelegramInput(data.telegramChatId ?? "");
      });
  }, []);

  async function saveTelegram() {
    setTelegramSave("saving");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramChatId: telegramInput || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMe((prev) => (prev ? { ...prev, ...updated } : prev));
        setTelegramSave("saved");
        showToast("Telegram chat connected.");
        // Brief "Saved" confirmation right on the button, then back to normal.
        setTimeout(() => setTelegramSave("idle"), 1600);
      } else {
        const data = await res.json().catch(() => null);
        setTelegramSave("idle");
        showToast(data?.error ?? "Couldn't save the Telegram chat ID.", "error");
      }
    } catch {
      setTelegramSave("idle");
      showToast("Couldn't reach the server. Try again.", "error");
    }
  }

  async function saveLeadDays(days: number) {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultLeadDays: days }),
    });
    if (res.ok) {
      const updated = await res.json();
      setMe((prev) => (prev ? { ...prev, ...updated } : prev));
      showToast("Default lead time updated.");
    } else {
      const data = await res.json().catch(() => null);
      showToast(data?.error ?? "Couldn't update the default lead time.", "error");
    }
  }

  async function handleEnablePush() {
    const result = await enablePushNotifications();
    showToast(
      result.ok ? "Push notifications enabled on this device." : result.error ?? "Something went wrong",
      result.ok ? "success" : "error"
    );
    if (result.ok) {
      const r = await fetch("/api/me");
      setMe(await r.json());
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (!me) return <SettingsSkeleton />;

  return (
    <>
      <main className="max-w-160 mx-auto px-4 sm:px-6 pt-6 sm:pt-9 pb-20">
        <h1 className="font-display text-2xl font-semibold text-ink mb-6">
          Settings
        </h1>

        <Section title="Account">
          <Row label="Email" value={me.email} />
        </Section>

        <Section title="Notification channels">
          <Row
            icon={<Bell size={13} />}
            label="Browser push"
            value={me.pushDeviceCount > 0 ? `${me.pushDeviceCount} device(s) enabled` : "Not enabled"}
            action={me.pushDeviceCount === 0 ? { label: "Enable", onClick: handleEnablePush } : undefined}
          />
          <div className="p-4 border-t border-line">
            <div className="flex items-center gap-1.5 text-sm text-ink-soft mb-2">
              <Send size={13} /> Telegram chat ID
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="input"
                placeholder="e.g. 5839201744"
                value={telegramInput}
                onChange={(e) => setTelegramInput(e.target.value)}
              />
              <button
                onClick={saveTelegram}
                disabled={telegramSave === "saving"}
                className={`shrink-0 flex items-center justify-center gap-1.5 transition-colors text-xs font-semibold rounded-md px-3 py-2.5 sm:py-0 min-w-20 ${telegramSave === "saved"
                  ? "bg-teal text-white"
                  : "bg-brand hover:bg-brand-light text-white disabled:opacity-70 disabled:cursor-wait"
                  }`}
              >
                {telegramSave === "saving" && <Loader2 size={12} className="animate-spin" />}
                {telegramSave === "saved" && <Check size={12} />}
                {telegramSave === "saving" ? "Saving…" : telegramSave === "saved" ? "Saved" : "Save"}
              </button>
            </div>
            <p className="text-xs text-ink-soft mt-2">
              Message <b>@RechargeGuardBot</b> on Telegram, send <code>/start</code>, and paste the chat ID it replies with.
            </p>
          </div>
        </Section>

        <Section title="Reminders">
          <div className="p-4">
            <div className="text-sm text-ink-soft mb-2">Default lead time</div>
            <select
              className="input"
              value={me.defaultLeadDays}
              onChange={(e) => saveLeadDays(Number(e.target.value))}
            >
              {[1, 2, 3, 5, 7].map((d) => (
                <option key={d} value={d}>
                  {d} day{d > 1 ? "s" : ""} before due date
                </option>
              ))}
            </select>
          </div>
        </Section>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm font-semibold text-rose border border-line rounded-lg mt-2 px-4 py-2.5 hover:bg-rose-soft transition-colors cursor-pointer"
        >
          <LogOut size={14} /> Sign out
        </button>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-ink-soft mb-2">
        {title}
      </div>
      <div className="bg-white border border-line rounded-lg overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  action,
  icon,
}: {
  label: string;
  value: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 border-b border-line last:border-b-0">
      <div>
        <div className="text-sm text-ink-soft">
          {label}
        </div>
        <div className="font-mono text-sm text-ink mt-0.5 flex items-center gap-1.5">
          {icon} {value}
        </div>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs font-semibold text-ink bg-paper-dim border-none rounded-md px-3 py-1.5 self-start sm:self-auto"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
