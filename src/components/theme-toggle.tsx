"use client";

import { ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function subscribe() {
  return () => {};
}

/**
 * Light / dark / system theme picker (NASCAR-090). Custom menu instead of a
 * native select so the dropdown uses the app font (native option lists don't).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!mounted) {
    return (
      <div
        className={cn(
          "border-input h-8 w-[7.5rem] rounded-lg border",
          className,
        )}
        aria-hidden
      />
    );
  }

  const current = MODES.find((m) => m.value === theme) ?? MODES[2];
  const Icon = current.icon;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Color theme"
        onClick={() => setOpen((value) => !value)}
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex h-8 w-[7.5rem] items-center gap-1.5 rounded-lg border bg-transparent pr-2 pl-2.5 font-sans text-sm transition-colors outline-none focus-visible:ring-3"
      >
        <Icon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
        <span className="flex-1 truncate text-left">{current.label}</span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Color theme"
          className="border-border bg-popover text-popover-foreground absolute top-full right-0 z-50 mt-1 w-full min-w-[7.5rem] overflow-hidden rounded-lg border py-1 font-sans text-sm shadow-md"
        >
          {MODES.map((mode) => {
            const ModeIcon = mode.icon;
            const selected = mode.value === (theme ?? "system");

            return (
              <li key={mode.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors",
                    selected
                      ? "bg-muted text-foreground"
                      : "hover:bg-muted/70 text-foreground",
                  )}
                  onClick={() => {
                    setTheme(mode.value);
                    setOpen(false);
                  }}
                >
                  <ModeIcon className="text-muted-foreground size-3.5 shrink-0" />
                  {mode.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
