"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function NutritionistPatientsPage() {
  const [rows, setRows] = useState<{ student: { id: string; name: string; email: string } }[]>([]);

  useEffect(() => {
    api("/nutritionist/patients")
      .then(setRows)
      .catch((e) => notify.apiError(e));
  }, []);

  return (
    <AppShell role="NUTRITIONIST" title="Pacientes">
      {rows.map((r) => (
        <Link key={r.student.id} href={`/nutritionist/patients/${r.student.id}`}>
          <Card className="mb-3 transition hover:shadow-md">
            <p className="font-medium">{r.student.name}</p>
            <p className="text-sm text-ink-800/65">{r.student.email}</p>
          </Card>
        </Link>
      ))}
    </AppShell>
  );
}
