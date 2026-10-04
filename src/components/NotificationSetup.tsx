"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, Send } from "lucide-react";
import Field from "@/components/Field";
import { enablePushNotifications } from "@/lib/pushClient";

/**
 * Post-signup onboarding screen. This existed as a component but was never
 * reachable — nothing rendered it, and it wasn't wired to real data: every
 * style referenced an undefined `COLORS` object left over from the original
 * prototype, `onDone`/`onSkip` were referenced as if passed in but never
 * declared as props, and the "Connect" button didn't call any API. Rebuilt
 * to use the app's real Tailwind design tokens and to actually call
 * `enablePushNotifications()` / `PATCH /api/me`, and wired up at the
 * `/notifications` route (see src/app/notifications/page.tsx) so the
 * signup flow (Landing -> Signup -> Notifications Setup -> Dashboard)
 * actually has somewhere to land.
 */
function NotificationSetup() {
    const router = useRouter();
    const [pushOn, setPushOn] = useState(false);
    const [pushMessage, setPushMessage] = useState<string | null>(null);
    const [telegramMessage, setTelegramMessage] = useState<string | null>(null);
    const [telegramOpen, setTelegramOpen] = useState(false);
    const [telegramConnected, setTelegramConnected] = useState(false);

    const [telegramChatId, setTelegramChatId] = useState("");
    const [connecting, setConnecting] = useState(false);
    const [continuing, setContinuing] = useState(false);

    useEffect(() => {
        fetch("/api/me")
            .then((r) => (r.ok ? r.json() : null))
            .then((me) => {
                if (!me) return;
                setPushOn(me.pushDeviceCount > 0);
                setTelegramConnected(Boolean(me.telegramChatId));
            });
    }, []);

    async function handleEnablePush() {
        const result = await enablePushNotifications();
        if (result.ok) {
            setPushOn(true);
            setPushMessage(null);
        } else {
            setPushMessage(result.error ?? "Something went wrong");
        }
    }

    async function handleConnectTelegram() {
        if (!telegramChatId.trim()) return;
        setConnecting(true);
        try {
            const res = await fetch("/api/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ telegramChatId: telegramChatId.trim() }),
            });
            if (res.ok) {
                setTelegramConnected(true);
            } else {
                const data = await res.json().catch(() => null);
                setTelegramMessage(data?.error ?? "Could not connect Telegram.");
            }
        } finally {
            setConnecting(false);
        }
    }

    function goToDashboard() {
        setContinuing(true);
        router.push("/dashboard");
    }

    return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6">
            <div className="w-full max-w-115 bg-white border border-line rounded-xl p-8">
                {/* Header icon */}
                <div className="w-11 h-11 rounded-lg bg-teal-soft flex items-center justify-center mb-4">
                    <Bell size={19} className="text-teal" />
                </div>

                {/* Heading */}
                <h2 className="font-display font-semibold text-ink text-2xl m-0">
                    Where should reminders land?
                </h2>

                <p className="font-semibold text-ink-soft text-sm mt-2 leading-[1.6]">
                    Turn on at least one channel. You can use both — Telegram is optional but works even if you clear your browser data.
                </p>

                {/* Browser push - primary */}
                <div className={`mt-5.5 border rounded-lg p-4 ${pushOn ? "border-teal bg-teal-soft" : "border-line bg-white"}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 ${pushOn ? "bg-white" : "bg-paper-dim"}`}>
                                <Bell size={16} className="text-ink" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-ink">
                                    Browser push
                                </div>
                                <div className="text-xs text-ink-soft mt-0.5 max-w-70">
                                    Recommended default — works even if you never touch Telegram.
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleEnablePush}
                            disabled={pushOn}
                            className={`text-xs font-semibold border-none rounded-md px-3.5 py-1.5 shrink-0 
                                ${pushOn ? "text-white bg-teal cursor-default" : "text-ink bg-paper-dim cursor-pointer"}`}
                        >
                            {pushOn ? "Enabled" : "Enable"}
                        </button>
                    </div>
                    {pushMessage && (
                        <p className="text-xs text-rose mt-2">{pushMessage}</p>
                    )}
                </div>

                {/* Telegram - optional, expandable */}
                <div className={`mt-3 border rounded-lg p-4 
                    ${telegramConnected ? "border-teal bg-teal-soft" : "border-line bg-white"}`}>
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <div
                                className={`flex justify-center items-center shrink-0 w-8.5 h-8.5 rounded-lg 
                                ${telegramConnected ? "bg-white" : "bg-paper-dim"}`}>
                                <Send size={16} className="text-ink" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-ink">
                                    Telegram <span className="text-ink-soft font-medium">· optional</span>
                                </div>
                                <div className="text-xs text-ink-soft mt-0.5 max-w-70">
                                    A second, more durable channel. Good if you&apos;re not always on this browser.
                                </div>
                            </div>
                        </div>
                        {!telegramConnected && (
                            <button
                                onClick={() => setTelegramOpen(v => !v)}
                                className="text-xs font-semibold text-ink bg-paper-dim border-none rounded-md px-3.5 py-1.5 shrink-0 cursor-pointer"
                            >
                                {telegramOpen ? "Hide" : "Set up"}
                            </button>
                        )}
                    </div>

                    {telegramOpen && !telegramConnected && (
                        <div className="mt-4 pt-4 border-t border-dashed border-line">
                            <div className="flex flex-col gap-3">
                                <Step
                                    n={1}
                                    text={<>Message <b>@RechargeGuardBot</b> on Telegram</>}
                                />
                                <Step
                                    n={2}
                                    text={
                                        <>
                                            Send
                                            <code className="font-mono bg-paper-dim rounded px-1.5 py-0.5 text-xs">
                                                /start
                                            </code>
                                            — it replies with your chat ID
                                        </>
                                    }
                                />
                                <Step
                                    n={3}
                                    text="Paste that ID below"
                                />
                            </div>
                            <div className="mt-3.5">
                                <Field label="Telegram chat ID">
                                    <input
                                        className="input"
                                        placeholder="e.g. 5839201744"
                                        value={telegramChatId}
                                        onChange={(e) => setTelegramChatId(e.target.value)}
                                    />
                                </Field>
                            </div>
                            <button
                                onClick={handleConnectTelegram}
                                disabled={connecting || !telegramChatId.trim()}
                                className="text-sm font-semibold text-white bg-ink border-none rounded-lg px-4 py-2 cursor-pointer disabled:opacity-60"
                            >
                                {connecting ? "Connecting…" : "Connect"}
                            </button>
                            {telegramMessage && (
                                <p className="text-xs text-rose mt-2">{telegramMessage}</p>
                            )}
                        </div>
                    )}
                </div>

                {!pushOn && !telegramConnected && (
                    <div className="mt-3.5 text-xs text-amber bg-amber-soft rounded-lg px-3 py-2.5">
                        Nothing&apos;s on yet — you won&apos;t get reminded until you enable at least one channel.
                    </div>
                )}

                <div className="flex gap-2.5 mt-5">
                    <button
                        onClick={goToDashboard}
                        disabled={continuing}
                        className="flex-1 text-sm font-semibold text-white bg-ink border-none rounded-lg py-2.75 cursor-pointer disabled:opacity-60"
                    >
                        Continue
                    </button>
                    <button
                        onClick={goToDashboard}
                        disabled={continuing}
                        className="text-sm font-semibold text-ink-soft bg-transparent border border-line rounded-lg px-4 py-2.75 cursor-pointer disabled:opacity-60"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
}

function Step({ n, text }: { n: number; text: ReactNode }) {
    return (
        <div className="flex gap-3 items-start">
            <div className="w-5.5 h-5.5 rounded-full bg-paper-dim shrink-0 flex items-center justify-center font-mono text-[11.5px] font-semibold text-ink">
                {n}
            </div>
            <div className="text-[13.5px] text-ink leading-normal pt-px">
                {text}
            </div>
        </div>
    );
}

export default NotificationSetup