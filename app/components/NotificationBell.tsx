"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import type { Notification } from "@/lib/notifications";

const READ_KEY = "tracko:readNotifications";
const REFRESH_MS = 60_000;

const ICONS: Record<Notification["kind"], string> = {
  overdue: "ph:warning-circle-fill",
  due_soon: "ph:clock-countdown-fill",
  payment: "ph:check-circle-fill",
  part_payment: "ph:coins-fill",
};

const TONES: Record<Notification["kind"], string> = {
  overdue: "text-red-500",
  due_soon: "text-amber-500",
  payment: "text-emerald-500",
  part_payment: "text-sky-500",
};

function readIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setRead(readIds()), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not load your alerts.");
      setItems(data.notifications ?? []);
      setError("");
    } catch (err: any) {
      setError(err?.message ?? "Could not load your alerts.");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Close on outside click and on Escape — a panel you cannot dismiss on a
  // phone is worse than no panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !read.has(n.id));

  function markAllRead() {
    const next = new Set([...read, ...items.map((n) => n.id)]);
    setRead(next);
    try {
      localStorage.setItem(READ_KEY, JSON.stringify([...next]));
    } catch {
      /* read state is a nicety, not worth failing over */
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`}
        aria-expanded={open}
        className="relative rounded-full p-2 transition-colors hover:bg-surface-2"
      >
        <Icon
          icon="ph:bell"
          width="22"
          height="22"
          className="text-text-muted"
        />
        {unread.length > 0 && (
          <span className="absolute right-0.5 top-0.5 flex min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-[17px] text-white">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-text">
              Notifications
            </p>
            {unread.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-teal hover:underline dark:text-cyan"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(70vh,26rem)] overflow-y-auto overscroll-contain">
            {error ? (
              <p className="px-4 py-6 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Icon
                  icon="ph:check-circle"
                  width="28"
                  height="28"
                  className="mx-auto mb-2 text-text-soft"
                />
                <p className="text-sm text-text-muted">
                  Nothing needs your attention.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((item) => {
                  const isUnread = !read.has(item.id);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/orders/${item.orderId}`}
                        onClick={() => setOpen(false)}
                        className={`flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2 dark:hover:bg-surface-2/60 ${
                          isUnread ? "bg-cyan/5 dark:bg-cyan/10" : ""
                        }`}
                      >
                        <Icon
                          icon={ICONS[item.kind]}
                          width="18"
                          height="18"
                          className={`mt-0.5 shrink-0 ${TONES[item.kind]}`}
                        />
                        <div className="min-w-0 flex-1">
                          {/* No `capitalize` here: the title is a sentence and
                              the customer name already carries its own casing,
                              so title-casing turns it into "Is 7 Days Late". */}
                          <p className="text-sm font-medium text-text">
                            {item.title}
                          </p>
                          <p className="mt-0.5 text-xs text-text-muted">
                            {item.body}
                          </p>
                          <p className="mt-1 text-[11px] text-text-soft">
                            {timeAgo(item.at)}
                          </p>
                        </div>
                        {isUnread && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
