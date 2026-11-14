"use client";

import { useSyncExternalStore } from "react";
import Icon from "./Icon";

type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function current(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", callback);
  return () => {
    listeners.delete(callback);
    query.removeEventListener("change", callback);
  };
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, current, () => "light" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("mentora-theme", next);
    } catch {
      // Private browsing can refuse storage. The choice still applies until the page closes.
    }
    listeners.forEach((callback) => callback());
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`flex h-10 w-10 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azure ${className}`}
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} className="h-5 w-5" />
    </button>
  );
}
