"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@iconify/react";
import { useTheme } from "@/lib/use-theme";

const NAV_LINKS = [
  { path: "/", title: "Home", icon: "solar:home-2-linear" },
  { path: "/orders", title: "Orders", icon: "solar:shop-linear" },
  { path: "/account", title: "Account", icon: "solar:user-circle-linear" },
  { path: "/settings", title: "Settings", icon: "solar:settings-linear" },
  { path: "/contact", title: "Contact", icon: "solar:phone-calling-linear" },
];

function Navbar({
  navbar,
  setNavbar,
  isDesktop = false,
}: {
  navbar: boolean;
  setNavbar: React.Dispatch<React.SetStateAction<boolean>>;
  isDesktop?: boolean;
}) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const navContent = (
    <div className="flex h-full flex-col bg-white">
      <div className="relative bg-cyan p-6 px-4 pt-10 text-white dark:bg-teal">
        {!isDesktop && (
          <button
            className="absolute right-4 top-4 text-white/70 hover:text-white"
            onClick={() => setNavbar(false)}
            aria-label="Close menu"
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
        <p className="px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-text-soft">
          Menu
        </p>

        {NAV_LINKS.map((link) => {
          // Every route starts with "/", so Home needs an exact match or it
          // would light up on every page.
          const active =
            link.path === "/" ? pathname === "/" : pathname.startsWith(link.path);

          return (
            <Link
              href={link.path}
              key={link.title}
              onClick={() => setNavbar(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 border-l-4 px-4 py-4 transition-colors ${
                active
                  ? "border-cyan bg-cyan/10 text-teal-deep dark:bg-cyan/15 dark:text-cyan"
                  : "border-transparent text-text-muted hover:border-cyan hover:bg-surface-2"
              }`}
            >
              <Icon
                icon={link.icon}
                width="22"
                height="22"
                className={active ? "text-cyan" : "text-text-soft"}
              />
              <span className="text-[14px] font-bold uppercase tracking-tight">{link.title}</span>
            </Link>
          );
        })}

        <div className="mt-auto px-4 py-4">
          <button
            onClick={toggleTheme}
            className="flex w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-sm text-text-muted transition-colors hover:bg-surface-2"
          >
            <span className="flex items-center gap-3">
              <Icon
                icon={theme === "dark" ? "ph:moon-fill" : "ph:sun-fill"}
                width="18"
                height="18"
                className="text-text-muted"
              />
              Theme
            </span>
            <span className="text-xs font-semibold capitalize text-text-muted">
              {theme}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-line bg-white shadow-xl lg:flex">
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
        className={`fixed left-0 top-0 z-50 h-full w-[280px] transform bg-surface shadow-2xl transition-transform duration-300 ease-in-out ${
          navbar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </div>
    </div>
  );
}

export default Navbar;
