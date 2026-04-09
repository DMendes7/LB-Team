"use client";

import { Toaster } from "sonner";

/**
 * Toaster global — cores alinhadas ao tema LB (brand / ink), canto superior direito.
 */
export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      expand={false}
      gap={10}
      visibleToasts={5}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group font-sans !rounded-2xl !border !border-brand-100/90 !bg-white/95 !shadow-card !backdrop-blur-sm !text-ink-900 !p-4 !text-sm",
          title: "!font-medium !text-ink-900 !text-sm",
          description: "!text-ink-800/80 !text-xs !mt-0.5",
          closeButton:
            "!border-brand-200 !bg-white !text-ink-800 hover:!bg-brand-50 !rounded-lg",
          success:
            "!border-emerald-200/80 !bg-gradient-to-br !from-white !to-emerald-50/40 [&_[data-icon]]:!text-emerald-600",
          error:
            "!border-red-200/90 !bg-gradient-to-br !from-white !to-red-50/35 [&_[data-icon]]:!text-red-600",
          warning:
            "!border-amber-200/90 !bg-gradient-to-br !from-white !to-amber-50/50 [&_[data-icon]]:!text-amber-700",
          info: "!border-brand-200/90 !bg-gradient-to-br !from-white !to-brand-50/40 [&_[data-icon]]:!text-brand-600",
        },
      }}
    />
  );
}
