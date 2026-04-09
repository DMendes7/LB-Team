import { toast, type ExternalToast } from "sonner";

/** Extrai mensagem legível de erros da API (JSON `{ message }` ou texto). */
export function parseApiError(err: unknown): string {
  if (err instanceof Error) {
    const raw = err.message.trim();
    if (raw.startsWith("{")) {
      try {
        const j = JSON.parse(raw) as { message?: string | string[]; error?: string };
        if (typeof j.message === "string" && j.message.trim()) return j.message.trim();
        if (Array.isArray(j.message)) return j.message.join(". ");
        if (typeof j.error === "string" && j.error.trim()) return j.error.trim();
      } catch {
        /* ignorar parse */
      }
    }
    if (raw) return raw;
  }
  return "Algo deu errado. Tente de novo.";
}

const base: ExternalToast = {
  duration: 4200,
  className: "font-sans",
};

export const notify = {
  success: (msg: string, opts?: ExternalToast) => toast.success(msg, { ...base, ...opts }),
  error: (msg: string, opts?: ExternalToast) => toast.error(msg, { duration: 6200, ...base, ...opts }),
  warning: (msg: string, opts?: ExternalToast) => toast.warning(msg, { ...base, ...opts }),
  info: (msg: string, opts?: ExternalToast) => toast.info(msg, { ...base, ...opts }),
  /** Erro vindo de `catch` / API. */
  apiError: (err: unknown, opts?: ExternalToast) =>
    toast.error(parseApiError(err), { duration: 6500, ...base, ...opts }),
  loading: toast.loading,
  dismiss: toast.dismiss,
  promise: toast.promise,
};
