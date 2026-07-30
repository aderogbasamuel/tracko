"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { whatsAppLink } from "@/lib/whatsapp";
import ErrorNotice from "./ErrorNotice";

/** Composes today's performance summary and opens it as a WhatsApp draft. */
export default function DailySummaryButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<{ message: string; phone: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  async function build() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/summary/today");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not build today's summary.");
      setSummary(data);
    } catch (err: any) {
      setError(err?.message ?? "Could not build today's summary.");
    } finally {
      setLoading(false);
    }
  }

  const link = summary ? whatsAppLink(summary.phone, summary.message) : null;

  return (
    <div className="space-y-3">
      {!summary ? (
        <button
          onClick={build}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold text-text shadow-sm transition hover:bg-surface-2 disabled:opacity-50 sm:w-auto"
        >
          <Icon
            icon={loading ? "ph:spinner-bold" : "ph:paper-plane-tilt-bold"}
            width="16"
            height="16"
            className={loading ? "animate-spin" : ""}
          />
          {loading ? "Working it out..." : "Send today's summary"}
        </button>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-4 space-y-3">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-text-muted">
            {summary.message}
          </pre>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
            <button
              onClick={() => setSummary(null)}
              className="px-2 py-2 text-xs font-semibold text-text-muted hover:text-text-muted"
            >
              Close
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(summary.message).then(
                  () => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  },
                  () => setError("Could not copy the summary.")
                );
              }}
              className="px-2 py-2 text-xs font-semibold text-text-muted hover:text-text"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 active:scale-95"
              >
                <Icon icon="ph:whatsapp-logo-fill" width="15" height="15" />
                Send to myself
              </a>
            ) : (
              <span className="text-xs text-text-soft">
                No WhatsApp number on your BMONI profile — copy it instead.
              </span>
            )}
          </div>
        </div>
      )}

      <ErrorNotice message={error} onRetry={build} />
    </div>
  );
}
