"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";

function Navbar({
  navbar,
  setNavbar,
  isDesktop = false,
}: {
  navbar: boolean;
  setNavbar: React.Dispatch<React.SetStateAction<boolean>>;
  isDesktop?: boolean;
}) {
  const navLinks = [
    { path: "/", title: "Home", icon: "solar:home-2-linear" },
    { path: "/orders", title: "Orders", icon: "solar:shop-linear" },
    { path: "/account", title: "Account", icon: "solar:user-circle-linear" },
    { path: "/settings", title: "Settings", icon: "solar:settings-linear" },
    { path: "/contact", title: "Contact", icon: "solar:phone-calling-linear" },
  ];

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("theme");
      if (
        stored === "dark" ||
        (!stored && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const navContent = (
    <div className="flex h-full flex-col bg-white">
      <div className="bg-[#2adadd] p-6 px-4 pt-10 text-white relative">
        {!isDesktop && (
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setNavbar(false)}
          >
            <Icon icon="tabler:x" width="24" height="24" />
          </button>
        )}

        <div>
          <h3 className="text-xl font-bold">Tracko</h3>
          <p className="text-sm text-white/70">Track every sale. Grow every day.</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto py-4">
        <p className="px-5 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
          Menu
        </p>
        {navLinks.map((link) => (
          <Link
            href={link.path}
            key={link.title}
            onClick={() => setNavbar(false)}
            className="flex items-center gap-3 px-4 py-4 text-gray-700 transition-colors border-l-4 border-transparent hover:bg-gray-50 hover:border-[#2adadd]"
          >
            <Icon icon={link.icon} width="22" height="22" className="text-gray-400" />
            <span className="font-bold text-[14px] uppercase tracking-tight">{link.title}</span>
          </Link>
        ))}
        <div className="mt-auto px-4 py-4">
          <button
            className="flex w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 theme-toggle"
            onClick={() => {
              const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
              if (next === "dark") document.documentElement.classList.add("dark");
              else document.documentElement.classList.remove("dark");
              try {
                localStorage.setItem("theme", next);
              } catch (e) {}
            }}
          >
            <span className="flex items-center gap-3">
              <Icon icon="ic:round-dark-mode" width="18" height="18" className="text-gray-500" />
              Theme
            </span>
            <span className="text-xs text-gray-500">Toggle</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-gray-200 bg-white shadow-xl lg:flex">
        {navContent}
      </aside>
    );
  }

  return (
    <div className="lg:hidden">
      {navbar && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setNavbar(false)}
        />
      )}

      <div
        className={`fixed left-0 top-0 z-50 h-full w-[280px] transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          navbar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </div>
    </div>
  );
}

export default Navbar;