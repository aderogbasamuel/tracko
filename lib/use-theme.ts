"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/**
 * The theme was previously toggled from two places — the sidebar and the
 * settings page — each with its own copy of the DOM logic and its own local
 * state. Flipping one left the other showing the wrong label. This hook is the
 * single source of truth; every toggle goes through it and all mounted
 * consumers stay in sync via a custom event.
 */
const EVENT = "tracko:themechange";

export function resolveStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* private mode / storage disabled */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  // Starts as "light" so server and first client render agree; the real value
  // is adopted in the effect below. The inline script in layout.tsx has already
  // put the correct class on <html>, so there is no visible flash.
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(resolveStoredTheme());
    const onChange = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the class is applied regardless; only persistence is lost */
    }
    window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: next }));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}
