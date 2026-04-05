import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-white/90 backdrop-blur-sm shadow-card border border-brand-100/60 p-5 animate-fade-in",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50",
        variant === "primary" &&
          "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md hover:shadow-glow hover:from-brand-600 hover:to-brand-700",
        variant === "outline" && "border border-brand-300 text-brand-800 hover:bg-brand-50",
        variant === "ghost" && "text-ink-800 hover:bg-brand-50/80",
        className,
      )}
      {...props}
    />
  );
}

export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function StreakFire({ on, days }: { on: boolean; days: number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={clsx(
          "text-3xl transition-all duration-300",
          on ? "drop-shadow-[0_0_12px_rgba(249,115,22,0.8)] scale-100" : "grayscale opacity-40 scale-95",
        )}
        aria-hidden
      >
        {on ? "🔥" : "·"}
      </span>
      <div>
        <p className="text-xs uppercase tracking-wider text-brand-700/80 font-medium">Sequência</p>
        <p className="font-display text-xl font-semibold text-ink-900">{days} dias</p>
      </div>
    </div>
  );
}
