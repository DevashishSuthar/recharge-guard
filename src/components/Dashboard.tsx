"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { EditModal, RechargeFormValues } from "@/components/EditModal";
import { RechargeCard } from "@/components/RechargeCard";
import { RechargeCardSkeleton } from "@/components/RechargeCardSkeleton";
import { enablePushNotifications } from "@/lib/pushClient";
import { useToast } from "@/components/Toast";
import type { RechargeItem } from "@/lib/types";

const emptyValues: RechargeFormValues = {
  label: "",
  provider: "",
  type: "MOBILE",
  phone: "",
  amount: 0,
  cycleDays: 28,
  lastRecharge: new Date().toISOString().slice(0, 10),
  leadDays: 3,
};

export function Dashboard() {
  const { showToast } = useToast();
  const [items, setItems] = useState<RechargeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushDeviceCount, setPushDeviceCount] = useState(0);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<RechargeFormValues>(emptyValues);
  const [saving, setSaving] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [rechargesRes, meRes] = await Promise.all([
      fetch("/api/recharges"),
      fetch("/api/me"),
    ]);
    if (rechargesRes.ok) setItems(await rechargesRes.json());
    if (meRes.ok) {
      const me = await meRes.json();
      setPushDeviceCount(me.pushDeviceCount);
      setTelegramConnected(Boolean(me.telegramChatId));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount, not an external subscription
    load();
  }, [load]);

  function openAdd() {
    setEditingId(null);
    setInitialValues(emptyValues);
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
      lastRecharge: item.lastRecharge.slice(0, 10),
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
        await load();
      }
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
        const nextDue = new Date(updated.due).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        });
        showToast(`${item.label} marked as recharged — next due ${nextDue}.`);
      } else {
        showToast("Couldn't mark that as recharged. Try again.", "error");
      }
      await load();
    } finally {
      setMarkingId(null);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/recharges/${id}`, { method: "DELETE" });
    await load();
  }

  async function handleEnablePush() {
    const result = await enablePushNotifications();
    setPushMessage(result.ok ? "Push notifications enabled." : result.error ?? "Something went wrong");
    if (result.ok) await load();
  }

  const overdueCount = items.filter((i) => i.status === "overdue").length;
  const soonCount = items.filter((i) => i.status === "soon").length;
  const noChannel = pushDeviceCount === 0 && !telegramConnected;

  // const sorted = useMemo(() => [...items].sort((a, b) => dueInfo(a).daysLeft - dueInfo(b).daysLeft), [items]);
  // const overdueCount = items.filter(i => dueInfo(i).status === "overdue").length;
  // const soonCount = items.filter(i => dueInfo(i).status === "soon").length;

  return (
    <>
      <main className="max-w-shell mx-auto px-4 sm:px-6 pt-6 sm:pt-9 pb-20">
        {noChannel && !loading && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 bg-amber-soft text-amber text-sm rounded-lg px-4 py-3">
            <span>You won&apos;t get reminded until you enable a notification channel.</span>
            <button
              onClick={handleEnablePush}
              className="font-semibold underline shrink-0 text-left sm:text-inherit"
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
            className="flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-light transition-colors text-white text-sm font-semibold border-none rounded-lg px-4 py-2.5 cursor-pointer w-full sm:w-auto"
          >
            <Plus size={15} /> Add recharge
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <RechargeCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-line rounded-xl p-10 text-center text-ink-soft text-sm">
            No recharges yet. Add your first one to get reminders before it&apos;s due.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((item) => (
              <RechargeCard
                key={item.id}
                item={item}
                marking={markingId === item.id}
                onDone={() => handleMarkDone(item)}
                onEdit={() => openEdit(item)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        )}
      </main>

      {modalOpen && (
        <EditModal
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