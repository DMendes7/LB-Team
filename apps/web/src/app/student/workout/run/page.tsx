"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";

type Program =
  | { mode: "none" }
  | { mode: "single"; templateId: string }
  | { mode: "slots"; slots: { templateId: string }[] };

export default function WorkoutRunRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    api<Program>("/student/workout-program")
      .then((p) => {
        if (p.mode === "single") {
          router.replace(`/student/workout/run/${p.templateId}`);
          return;
        }
        if (p.mode === "slots" && p.slots.length === 1) {
          router.replace(`/student/workout/run/${p.slots[0].templateId}`);
          return;
        }
        router.replace("/student/workout");
      })
      .catch(() => router.replace("/student/workout"));
  }, [router]);

  return (
    <AppShell role="STUDENT" title="Executando">
      <p className="text-sm text-ink-800/75">Abrindo treino…</p>
    </AppShell>
  );
}
