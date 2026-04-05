"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui";

export default function AdminUsersPage() {
  const [rows, setRows] = useState<{ id: string; email: string; name: string; role: string }[]>([]);

  useEffect(() => {
    api<{ id: string; email: string; name: string; role: string }[]>("/admin/users")
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  return (
    <AppShell role="ADMIN" title="Usuários">
      {rows.map((u) => (
        <Card key={u.id} className="mb-2">
          <p className="font-medium">{u.name}</p>
          <p className="text-xs text-ink-800/65">
            {u.email} · {u.role}
          </p>
        </Card>
      ))}
    </AppShell>
  );
}
