import React from "react";
import Link from "next/link";

/**
 * Shared frame for login / signup. Split out so the two pages cannot drift
 * apart visually, which is what happened to settings and account.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Brand wash — teal into gold, the same pairing as the landing page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(42,218,221,0.28), rgba(255,187,1,0.14) 45%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 h-[24rem] w-[24rem] rounded-full opacity-50 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(23,108,119,0.22), transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <Link href="/landing" className="mb-6 flex items-center justify-center gap-2.5">
          <img src="/tracko.svg" alt="" className="h-8 w-8" />
          <span className="font-display text-2xl font-bold tracking-tight text-teal-deep dark:text-cyan">
            Tracko
          </span>
        </Link>

        <div className="rounded-3xl border border-line bg-surface p-7 shadow-xl shadow-teal-deep/10 sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-text">{title}</h1>
          <p className="mb-6 mt-1.5 text-sm leading-relaxed text-text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

export function AuthField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-text">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-text-soft">{hint}</span>}
    </label>
  );
}
