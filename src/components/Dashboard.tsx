"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { RechargeModal, RechargeFormValues } from "@/components/RechargeModal";
import { RechargeCard } from "@/components/RechargeCard";
import { RechargeCardSkeleton } from "@/components/RechargeCardSkeleton";
import { Reminders } from "@/components/Reminders";
import { useToast } from "@/components/Toast";
import { DEFAULT_CYCLE_DAYS, DEFAULT_LEAD_DAYS } from "@/lib/constants";
import { enablePushNotifications } from "@/lib/pushClient";
import type { RechargeItem } from "@/lib/types";
import { formatDueDate, todayIstInput, toIstDateInput } from "@/lib/utils";

/** Blank form for "Add recharge", pre-filled with the user's default lead time. */
function makeEmptyValues(leadDays: number): RechargeFormValues {
  return {
    label: "",
    provider: "",
    type: "MOBILE",
    phone: "",
    amount: 0,
    cycleDays: DEFAULT_CYCLE_DAYS,
    lastRecharge: todayIstInput(),
    leadDays,
  };
}

async function errorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return typeof data?.error === "string" ? data.error : fallback;
  } catch {
    return fallback;
  }
}

export function Dashboard() {
  const { showToast } = useToast();
  const [items, setItems] = useState<RechargeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pushDeviceCount, setPushDeviceCount] = useState(0);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [defaultLeadDays, setDefaultLeadDays] = useState(DEFAULT_LEAD_DAYS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<RechargeFormValues>(() =>
    makeEmptyValues(DEFAULT_LEAD_DAYS)
  );
  const [saving, setSaving] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [rechargesRes, meRes] = await Promise.all([fetch("/api/recharges"), fetch("/api/me")]);
      if (!rechargesRes.ok) throw new Error(String(rechargesRes.status));
      setItems(await rechargesRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setPushDeviceCount(me.pushDeviceCount);
        setTelegramConnected(Boolean(me.telegramChatId));
        setDefaultLeadDays(me.defaultLeadDays);
      }
      setLoadError(false);
    } catch {
      // Without this the skeleton cards stayed on screen forever after a failed fetch.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, not an external subscription
    load();
  }, [load]);

  function openAdd() {
    setEditingId(null);
    setInitialValues(makeEmptyValues(defaultLeadDays));
    setModalOpen(true);
  }

  function openEdit(item: RechargeItem) {
    setEditingId(item.id);
    setInitialValues({
      label: item.label,
      provider: item.provider,
      type: item.type,
      phone: item.phone ?? "",
      amount: item.amount,
      cycleDays: item.cycleDays,
      lastRecharge: toIstDateInput(item.lastRecharge),
      leadDays: item.leadDays,
    });
    setModalOpen(true);
  }

  async function handleSave(data: RechargeFormValues) {
    setSaving(true);
    try {
      const payload = {
        ...data,
        // PATCH needs an explicit null to clear the field; POST just omits it.
        phone: data.phone || (editingId ? null : undefined),
      };

      const res = await fetch(
        editingId ? `/api/recharges/${editingId}` : "/api/recharges",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setModalOpen(false);
        showToast(editingId ? "Recharge updated." : "Recharge added.");
        await load();
      } else {
        showToast(await errorMessage(res, "Couldn't save that recharge. Try again."), "error");
      }
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkDone(item: RechargeItem) {
    setMarkingId(item.id);
    try {
      const res = await fetch(`/api/recharges/${item.id}/recharge`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        showToast(`${item.label} marked as recharged — next due ${formatDueDate(updated.due)}.`);
      } else {
        showToast("Couldn't mark that as recharged. Try again.", "error");
      }
      await load();
    } catch {
      showToast("Couldn't reach the server. Check your connection and try again.", "error");
    } finally {
      setMarkingId(null);
    }
  }

  async function handleDelete(item: RechargeItem) {
    if (!window.confirm(`Delete the ${item.label} recharge?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/recharges/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast(`${item.label} deleted.`);
      await load();
    } catch {
      showToast("Couldn't delete that recharge. Try again.", "error");
    }
  }

  async function handleEnablePush() {
    const result = await enablePushNotifications();
    setPushMessage(result.ok ? "Push notifications enabled." : result.error ?? "Something went wrong");
    if (result.ok) await load();
  }

  // Most urgent first (overdue → soonest due).
  const sorted = useMemo(() => [...items].sort((a, b) => a.daysLeft - b.daysLeft), [items]);
  const overdueCount = items.filter((i) => i.status === "overdue").length;
  const soonCount = items.filter((i) => i.status === "soon").length;
  const noChannel = pushDeviceCount === 0 && !telegramConnected;

  // const sorted = useMemo(() => [...items].sort((a, b) => dueInfo(a).daysLeft - dueInfo(b).daysLeft), [items]);
  // const overdueCount = items.filter(i => dueInfo(i).status === "overdue").length;
  // const soonCount = items.filter(i => dueInfo(i).status === "soon").length;

  return (
    <>
      <main className="max-w-shell mx-auto px-4 sm:px-6 pt-6 sm:pt-9 pb-20">
        {noChannel && !loading && !loadError && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 bg-amber-soft text-amber text-sm rounded-lg px-4 py-3">
            <span>You won&apos;t get reminded until you enable a notification channel.</span>
            <button
              onClick={handleEnablePush}
              className="font-semibold underline shrink-0 text-left sm:text-inherit cursor-pointer"
            >
              Enable push
            </button>
          </div>
        )}
        {pushMessage && (
          <p className="mb-5 text-sm text-ink-soft">{pushMessage}</p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink m-0">
              Your recharges
            </h1>
            <p className="text-sm text-ink-soft mt-1.5">
              {overdueCount > 0
                ? `${overdueCount} overdue, ${soonCount} due soon`
                : soonCount > 0
                  ? `${soonCount} due soon — everything else is on track`
                  : "Everything's on track"}
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-1.5 bg-brand-strong hover:brightness-110 transition text-white text-sm font-semibold border-none rounded-lg px-4 py-2.5 cursor-pointer w-full sm:w-auto"
          >
            <Plus size={15} aria-hidden /> Add recharge
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <RechargeCardSkeleton key={i} />
            ))}
          </div>
        ) : loadError ? (
          <div className="border border-dashed border-line rounded-xl p-10 text-center text-ink-soft text-sm">
            Couldn&apos;t load your recharges.{" "}
            <button onClick={load} className="font-semibold underline cursor-pointer">
              Try again
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="border border-dashed border-line rounded-xl p-10 text-center text-ink-soft text-sm">
            No recharges yet. Add your first one to get reminders before it&apos;s due.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sorted.map((item) => (
              <RechargeCard
                key={item.id}
                item={item}
                marking={markingId === item.id}
                onDone={() => handleMarkDone(item)}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item)}
              />
            ))}
          </div>
        )}

        <Reminders defaultLeadDays={defaultLeadDays} />
      </main>

      {modalOpen && (
        <RechargeModal
          initialValues={initialValues}
          isEditing={Boolean(editingId)}
          saving={saving}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}