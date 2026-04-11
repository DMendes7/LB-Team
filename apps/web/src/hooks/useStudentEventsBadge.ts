"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";

const STORAGE_KEY = "lb_student_events_last_open_at";

type EventRow = { status: "upcoming" | "active" | "ended"; endsAt: string };

function lastOpenMs(): number {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(STORAGE_KEY);
  return v ? new Date(v).getTime() : 0;
}

/**
 * Indicadores na aba Eventos: evento ativo (estilo “gravação”) ou encerrado que o aluno ainda não “viu”
 * após o término (última abertura da lista antes do fim do evento).
 */
export function useStudentEventsBadge(enabled: boolean): "live" | "ended" | null {
  const pathname = usePathname();
  const [badge, setBadge] = useState<"live" | "ended" | null>(null);

  useEffect(() => {
    if (!enabled) {
      setBadge(null);
      return;
    }

    if (pathname?.startsWith("/student/events")) {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }

    let cancelled = false;
    api<EventRow[]>("/student/group-events")
      .then((rows) => {
        if (cancelled) return;
        const seen = lastOpenMs();
        const hasLive = rows.some((r) => r.status === "active");
        const hasUnseenEnded = rows.some(
          (r) => r.status === "ended" && new Date(r.endsAt).getTime() > seen,
        );
        if (hasLive) setBadge("live");
        else if (hasUnseenEnded) setBadge("ended");
        else setBadge(null);
      })
      .catch(() => {
        if (!cancelled) setBadge(null);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, pathname]);

  return enabled ? badge : null;
}
