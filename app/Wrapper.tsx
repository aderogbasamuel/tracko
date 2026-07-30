"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import Navbar from "./components/Navbar";
import NotificationBell from "./components/NotificationBell";

/**
 * The one app shell: sidebar, header, content slot.
 *
 * Not a Next.js layout.tsx — pages import and wrap themselves in it — because
 * the landing page and auth pages deliberately sit outside it. Previously the
 * dashboard rendered its own copy of the Navbar and header instead of using
 * this, so the two drifted apart; everything inside the app now goes through
 * here.
 */
export default function DashboardLayout({
  children,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const [navbar, setNavbar] = useState(false);

  return (
    <div className="min-h-screen bg-background font-body lg:flex">
      <Navbar setNavbar={setNavbar} navbar={navbar} isDesktop />

      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1800px]">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-surface/85 px-4 py-4 backdrop-blur-sm sm:px-6">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <img src="/tracko.svg" alt="" className="h-[26px] w-[26px]" />
              <span className="truncate font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
                Tracko
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <NotificationBell />
              <button
                onClick={() => setNavbar(true)}
                aria-label="Open menu"
                className="rounded-full p-2 transition-colors hover:bg-surface-2 lg:hidden"
              >
                <Icon
                  icon="ph:list-bold"
                  width="22"
                  height="22"
                  className="text-text-muted"
                />
              </button>
            </div>
          </header>

          {(title || actions) && (
            <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-6 sm:px-6">
              <div className="min-w-0">
                {title && (
                  <h1 className="font-display text-2xl font-bold tracking-tight text-text">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-text-soft">{subtitle}</p>
                )}
              </div>
              {actions}
            </div>
          )}

          <section className="pb-24 lg:pb-6">{children}</section>
        </div>
      </div>

      <Navbar setNavbar={setNavbar} navbar={navbar} />
    </div>
  );
}
