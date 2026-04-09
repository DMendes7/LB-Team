"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function TrainerStudentsPage() {
  const [rows, setRows] = useState<{ student: { id: string; name: string; email: string } }[]>([]);

  useEffect(() => {
    api("/trainer/students")
      .then(setRows)
      .catch((e) => notify.apiError(e));
  }, []);

  return (
    <AppShell role="TRAINER" title="Alunas">
      {rows.map((r) => (
        <Link key={r.student.id} href={`/trainer/students/${r.student.id}`}>
          <Card className="mb-3 transition hover:shadow-md">
            <p className="font-medium">{r.student.name}</p>
            <p className="text-sm text-ink-800/65">{r.student.email}</p>
          </Card>
        </Link>
      ))}
    </AppShell>
  );
}
