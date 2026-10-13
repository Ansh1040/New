"use client";

import { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function TrackerTheme({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="data-theme" storageKey="gate-companion-theme" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</ThemeProvider>;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return <button type="button" disabled={!mounted} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setTheme(dark ? "light" : "dark")} className="flex items-center gap-2 rounded-lg border border-[var(--desk-border)] bg-[var(--desk-surface)] px-3 py-2 text-sm font-semibold text-[color:var(--desk-link)] hover:bg-[var(--desk-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--desk-accent)] disabled:opacity-50">
    {dark ? <Sun size={16} aria-hidden="true"/> : <Moon size={16} aria-hidden="true"/>}<span className="hidden sm:inline">{dark ? "Light mode" : "Dark mode"}</span>
  </button>;
}
