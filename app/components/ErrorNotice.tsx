"use client";

import { Icon } from "@iconify/react";

/**
 * The visible half of every catch block. A silent failure on stage reads as a
 * frozen app, so anything that can fail renders one of these instead.
 */
export default function ErrorNotice({
  message,
  onRetry,
  className = "",
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 dark:border-red-900/50 dark:bg-red-950/30 ${className}`}
    >
      <Icon
        icon="ph:warning-circle-fill"
        width="18"
        height="18"
        className="mt-0.5 shrink-0 text-red-500"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-red-800 break-words dark:text-red-200">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-1.5 text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
