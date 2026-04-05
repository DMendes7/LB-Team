"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { Button } from "@/components/ui";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` usa destaque vermelho no botão de confirmação (ex.: excluir). */
  variant?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink-900/45 backdrop-blur-sm transition-opacity"
        aria-label="Fechar"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="relative z-10 w-full max-w-md rounded-2xl border border-brand-100/80 bg-white/95 p-6 shadow-card backdrop-blur-sm animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-display text-lg font-bold text-ink-900">
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="mt-2 text-sm leading-relaxed text-ink-800/85">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            className={clsx(
              variant === "danger" &&
                "!bg-gradient-to-r !from-red-600 !to-red-700 hover:!from-red-700 hover:!to-red-800 hover:!shadow-md",
            )}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
